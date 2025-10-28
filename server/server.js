// server.js
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import rateLimit from "express-rate-limit";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { details, groupDetails } from "./details.js";
import db from "./database/db.js";
import adminRoutes from "./routes/admin.js";
import cmsRoutes from "./routes/cms.js";
import publicRoutes from "./routes/public.js";

// Initialize environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
db.initDatabase();

// Auto-populate CMS from details.js if empty
const database = db.getDatabase();
const gamesCount = database.prepare('SELECT COUNT(*) as count FROM cms_games').get();
if (gamesCount.count === 0) {
  console.log('📦 CMS is empty, auto-populating from details.js...');

  // Import and populate
  import('./details.js').then(async ({ details, groupDetails }) => {
    try {
      // Populate games
      for (const game of details) {
        const insertStmt = database.prepare(`
          INSERT INTO cms_games (universe_id, name, is_active, display_order)
          VALUES (?, ?, ?, ?)
        `);
        insertStmt.run(game.id, game.name, game.show ? 1 : 0, 0);
      }
      console.log(`✅ Added ${details.length} games to CMS`);

      // Populate groups
      for (const group of groupDetails) {
        const insertStmt = database.prepare(`
          INSERT INTO cms_groups (group_id, name, is_active)
          VALUES (?, ?, ?)
        `);
        insertStmt.run(group.id, `Group ${group.id}`, 1);
      }
      console.log(`✅ Added ${groupDetails.length} groups to CMS`);

      // Trigger immediate data fetch
      console.log('🔄 Triggering initial data fetch...');
      setTimeout(() => fetchAllData(), 2000);
    } catch (error) {
      console.error('❌ Error auto-populating CMS:', error);
    }
  });
} else {
  console.log(`✅ CMS has ${gamesCount.count} games`);
}

const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Security and performance middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'https://glazinggorillagames.com',
  'https://www.glazinggorillagames.com',
  'https://gggnew.onrender.com',
  'https://gggnew.onrender.com/admin',
  'https://gggnew.onrender.com/admin/dashboard',
  'https://gggnew.onrender.com/admin/games/detailed',
  'https://gggnew.onrender.com/admin/groups/detailed',
  'https://gggnew.onrender.com/admin/cms'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or matches the domain
    if (allowedOrigins.includes(origin) || origin.startsWith('https://gggnew.onrender.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Session configuration for admin auth
const SQLiteStore = connectSqlite3(session);
const sessionDbDir = process.env.NODE_ENV === 'production' ? '/tmp' : './database';
console.log('📂 Session database directory:', sessionDbDir);

app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: sessionDbDir
  }),
  secret: process.env.SESSION_SECRET || 'ggg-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Allow cross-site cookies in production
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/proxy', limiter);

// API Routes
app.use('/api/public', publicRoutes);  // Public endpoints (no auth)
app.use('/api/admin', adminRoutes);
app.use('/api/cms', cmsRoutes);

// Also mount admin routes at /admin for frontend compatibility
app.use('/admin', adminRoutes);

// In-memory cache for latest data
let cachedLatestData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, retries = 3) => {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'GGGBackend/1.0',
        'Accept': 'application/json'
      }
    });
    return response;
  } catch (err) {
    if (err.response?.status === 429 && retries > 0) {
      const delay = Math.pow(2, 3 - retries) * 1000; // Exponential backoff
      console.warn(`⏳ Rate limited. Retrying in ${delay}ms...`);
      await sleep(delay);
      return fetchWithRetry(url, retries - 1);
    } else if (err.response?.status >= 500 && retries > 0) {
      console.warn(`⚠️ Server error ${err.response.status}. Retrying...`);
      await sleep(2000);
      return fetchWithRetry(url, retries - 1);
    } else {
      throw err;
    }
  }
};

// Concurrent fetch with rate limiting
const fetchConcurrentWithLimit = async (urls, maxConcurrent = 2) => {
  const results = [];
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(async ({ url, processor }) => {
      try {
        const response = await fetchWithRetry(url);
        return processor ? processor(response) : response;
      } catch (err) {
        console.warn(`⚠️ Fetch failed for ${url}:`, err.message);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean));

    // Longer delay between batches to avoid rate limiting
    if (i + maxConcurrent < urls.length) {
      await sleep(2000);
    }
  }
  return results;
};

// Cache management with longer duration for Render
const getCachedData = () => {
  if (cachedLatestData && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    return cachedLatestData;
  }
  return null;
};

const setCachedData = (data) => {
  cachedLatestData = data;
  cacheTimestamp = Date.now();
};

// Fallback data structure for when APIs fail
const createFallbackData = () => {
  const database = db.getDatabase();
  const cmsGames = database.prepare('SELECT * FROM cms_games WHERE is_active = 1 ORDER BY display_order ASC').all();
  const cmsGroups = database.prepare('SELECT * FROM cms_groups WHERE is_active = 1').all();

  return {
    timestamp: new Date(),
    games: cmsGames.map(game => ({
      universeId: game.universe_id,
      name: game.name,
      playing: 0,
      visits: 0,
      created: null,
      updated: null,
      maxPlayers: 0,
      isActive: false
    })),
    groups: cmsGroups.map(group => ({
      id: group.group_id,
      name: group.name,
      groupDetails: { memberCount: 0 }
    })),
    images: cmsGames.map(game => ({
      id: game.universe_id,
      name: game.name,
      media: game.thumbnail_url ? [{ imageUrl: game.thumbnail_url }] : []
    })),
    totalPlaying: 0,
    totalVisits: 0,
    totalMembers: 0,
    isFallback: true
  };
};

// Main fetch function with concurrent requests
const fetchAllData = async () => {
  try {
    console.log("🔄 Fetching all Roblox data...");

    // Get active games and groups from CMS database
    const database = db.getDatabase();
    const cmsGames = database.prepare('SELECT * FROM cms_games WHERE is_active = 1 ORDER BY display_order ASC').all();
    const cmsGroups = database.prepare('SELECT * FROM cms_groups WHERE is_active = 1').all();

    console.log(`📊 Fetching data for ${cmsGames.length} games and ${cmsGroups.length} groups from CMS`);

    // Prepare all fetch requests from CMS data
    const gameUrls = cmsGames.map(game => ({
      url: `https://games.roblox.com/v1/games?universeIds=${game.universe_id}`,
      processor: (response) => ({
        universeId: game.universe_id,
        name: game.name,
        ...(response.data.data[0] || {})
      })
    }));

    const groupUrls = cmsGroups.map(group => ({
      url: `https://groups.roblox.com/v1/groups/${group.group_id}`,
      processor: (response) => ({
        id: group.group_id,
        name: group.name,
        groupDetails: response.data || {}
      })
    }));

    const imageUrls = cmsGames.map(game => ({
      url: `https://thumbnails.roblox.com/v1/games/icons?universeIds=${game.universe_id}&size=512x512&format=Png&isCircular=false`,
      processor: (response) => ({
        id: game.universe_id,
        name: game.name,
        media: response.data.data || (game.thumbnail_url ? [{ imageUrl: game.thumbnail_url }] : [])
      })
    }));

    const votesUrls = cmsGames.map(game => ({
      url: `https://games.roblox.com/v1/games/votes?universeIds=${game.universe_id}`,
      processor: (response) => ({
        universeId: game.universe_id,
        upVotes: response.data.data?.[0]?.upVotes || 0,
        downVotes: response.data.data?.[0]?.downVotes || 0
      })
    }));

    // Fetch all data with reduced concurrency to avoid rate limiting
    const [gameResults, groupResults, imageResults, votesResults] = await Promise.all([
      fetchConcurrentWithLimit(gameUrls, 2),
      fetchConcurrentWithLimit(groupUrls, 2),
      fetchConcurrentWithLimit(imageUrls, 2),
      fetchConcurrentWithLimit(votesUrls, 2)
    ]);

    // Merge votes data with game results
    const gamesWithVotes = gameResults.map(game => {
      const votesData = votesResults.find(v => v.universeId === game.universeId);
      return {
        ...game,
        favorites: game.favoritedCount || 0,
        likes: votesData?.upVotes || 0
      };
    });

    // Calculate totals with fallback for missing data
    const totalPlaying = gamesWithVotes.reduce((sum, g) => sum + (g?.playing || 0), 0);
    const totalVisits = gamesWithVotes.reduce((sum, g) => sum + (g?.visits || 0), 0);
    const totalMembers = groupResults.reduce((sum, g) => sum + (g?.groupDetails?.memberCount || 0), 0);

    const logData = {
      timestamp: new Date(),
      games: gamesWithVotes.length > 0 ? gamesWithVotes : cmsGames.map(game => ({
        universeId: game.universe_id,
        name: game.name,
        playing: 0,
        visits: 0,
        favorites: 0,
        likes: 0
      })),
      groups: groupResults.length > 0 ? groupResults : cmsGroups.map(group => ({
        id: group.group_id,
        name: group.name,
        groupDetails: { memberCount: 0 }
      })),
      images: imageResults.length > 0 ? imageResults : cmsGames.map(game => ({
        id: game.universe_id,
        name: game.name,
        media: game.thumbnail_url ? [{ imageUrl: game.thumbnail_url }] : []
      })),
      totalPlaying,
      totalVisits,
      totalMembers,
    };

    // Save to SQLite database
    try {
      db.insertLog(logData);
      console.log("✅ Log saved to SQLite and cache updated.");
    } catch (dbError) {
      console.warn("⚠️ Database save failed:", dbError.message);
    }

    // Add timestamp for response
    logData.timestamp = new Date().toISOString();

    // Update cache
    setCachedData(logData);

    return logData;
  } catch (error) {
    console.error("❌ Fetch failed:", error.message);

    // Use fallback data when all APIs fail
    const fallbackData = createFallbackData();
    setCachedData(fallbackData);

    try {
      db.insertLog(fallbackData);
      console.log("✅ Fallback data saved to SQLite.");
    } catch (dbError) {
      console.warn("⚠️ Fallback database save failed:", dbError.message);
    }

    return fallbackData;
  }
};

// Initial fetch with delay to prevent cold start issues
setTimeout(() => {
  fetchAllData();
}, 5000); // 5 second delay for Render cold starts

setInterval(fetchAllData, 15 * 60 * 1000); // every 15 minutes

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes with caching
app.get("/proxy/latest", asyncHandler(async (_, res) => {
  // Try cache first
  const cached = getCachedData();
  if (cached) {
    res.set('Cache-Control', 'public, max-age=900'); // 15 minutes
    return res.json(cached);
  }

  // Fallback to database
  const latest = db.getLatestLog();
  if (!latest) {
    return res.status(503).json({ error: "Data not available yet." });
  }

  setCachedData(latest);
  res.set('Cache-Control', 'public, max-age=900');
  res.json(latest);
}));

app.get("/proxy/logs", asyncHandler(async (_, res) => {
  const logs = db.getRecentLogs(50);
  res.set('Cache-Control', 'public, max-age=900');
  res.json(logs);
}));

app.get("/proxy/groups", asyncHandler(async (_, res) => {
  const cached = getCachedData();
  if (cached) {
    res.set('Cache-Control', 'public, max-age=900');
    return res.json(cached.groups);
  }

  const latest = db.getLatestLog();
  if (!latest) {
    return res.status(503).json({ error: "Data not available yet." });
  }

  setCachedData(latest);
  res.set('Cache-Control', 'public, max-age=300');
  res.json(latest.groups);
}));

app.get("/proxy/images", asyncHandler(async (_, res) => {
  const cached = getCachedData();
  if (cached) {
    res.set('Cache-Control', 'public, max-age=900');
    return res.json(cached.images);
  }

  const latest = db.getLatestLog();
  if (!latest) {
    return res.status(503).json({ error: "Data not available yet." });
  }

  setCachedData(latest);
  res.set('Cache-Control', 'public, max-age=300');
  res.json(latest.images);
}));

app.get("/proxy/total", asyncHandler(async (_, res) => {
  const cached = getCachedData();
  if (cached) {
    const { totalPlaying, totalVisits, totalMembers } = cached;
    res.set('Cache-Control', 'public, max-age=900');
    return res.json({ totalPlaying, totalVisits, totalMembers });
  }

  const latest = db.getLatestLog();
  if (!latest) {
    return res.status(503).json({ error: "Data not available yet." });
  }

  setCachedData(latest);
  const { totalPlaying, totalVisits, totalMembers } = latest;
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ totalPlaying, totalVisits, totalMembers });
}));

app.get("/proxy/all", asyncHandler(async (_, res) => {
  const cached = getCachedData();
  if (cached) {
    const { games, groups, images, totalPlaying, totalVisits, totalMembers } = cached;
    res.set('Cache-Control', 'public, max-age=900');
    return res.json({
      gameData: games,
      groupData: groups,
      gameImages: images,
      totalData: { totalPlaying, totalVisits, totalMembers },
    });
  }

  const latest = db.getLatestLog();
  if (!latest) {
    return res.status(503).json({ error: "Data not available yet." });
  }

  setCachedData(latest);
  const { games, groups, images, totalPlaying, totalVisits, totalMembers } = latest;
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    gameData: games,
    groupData: groups,
    gameImages: images,
    totalData: { totalPlaying, totalVisits, totalMembers },
  });
}));

app.post("/proxy/refresh", asyncHandler(async (_, res) => {
  const data = await fetchAllData();
  res.json({ message: "Data refreshed successfully.", timestamp: new Date(), data });
}));

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date(),
    cache: {
      hasData: !!cachedLatestData,
      age: cacheTimestamp ? Date.now() - cacheTimestamp : null
    }
  });
});

// ============================================
// STATIC FILE SERVING (for React build)
// ============================================

// Serve static files from client/dist
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all route for React Router (must be AFTER all API routes)
app.get('*', (req, res) => {
  // Don't catch API routes - allow API routes to return 404 if not found
  // Note: /admin frontend routes should be served by React, only /api routes should 404
  if (req.path.startsWith('/api') || req.path.startsWith('/proxy') || req.path.startsWith('/health')) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Send React app for all other routes (including /admin frontend pages)
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🗄️  Database: SQLite`);
  console.log(`📁 Serving static files from: client/dist`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  db.closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  db.closeDatabase();
  process.exit(0);
});
