// server.js
import express from "express";
import axios from "axios";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { details, groupDetails } from "./details.js";
import Log from "./Log.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Security and performance middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://glazinggorillagames.com',
  'https://www.glazinggorillagames.com'
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/proxy', limiter);

// In-memory cache for latest data
let cachedLatestData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for better performance on Render

mongoose.connect(MONGO_URI);
mongoose.connection.once("open", () => console.log("✅ Connected to MongoDB"));
mongoose.connection.on("error", console.error);


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
const createFallbackData = () => ({
  timestamp: new Date(),
  games: details.map(game => ({
    universeId: game.id,
    name: game.name,
    playing: 0,
    visits: 0,
    created: null,
    updated: null,
    maxPlayers: 0,
    isActive: false
  })),
  groups: groupDetails.map(group => ({
    id: group.id,
    name: 'Group',
    groupDetails: { memberCount: 0 }
  })),
  images: details.map(game => ({
    id: game.id,
    name: game.name,
    media: []
  })),
  totalPlaying: 0,
  totalVisits: 0,
  totalMembers: 0,
  isFallback: true
});

// Main fetch function with concurrent requests
const fetchAllData = async () => {
  try {
    console.log("🔄 Fetching all Roblox data...");

    // Prepare all fetch requests
    const gameUrls = details.map(game => ({
      url: `https://games.roblox.com/v1/games?universeIds=${game.id}`,
      processor: (response) => ({
        universeId: game.id,
        name: game.name,
        ...(response.data.data[0] || {})
      })
    }));

    const groupUrls = groupDetails.map(group => ({
      url: `https://groups.roblox.com/v1/groups/${group.id}`,
      processor: (response) => ({
        id: group.id,
        name: group.name,
        groupDetails: response.data || {}
      })
    }));

    const imageUrls = details.map(game => ({
      url: `https://thumbnails.roblox.com/v1/games/icons?universeIds=${game.id}&size=512x512&format=Png&isCircular=false`,
      processor: (response) => ({
        id: game.id,
        name: game.name,
        media: response.data.data || []
      })
    }));

    // Fetch all data with reduced concurrency to avoid rate limiting
    const [gameResults, groupResults, imageResults] = await Promise.all([
      fetchConcurrentWithLimit(gameUrls, 2),
      fetchConcurrentWithLimit(groupUrls, 2),
      fetchConcurrentWithLimit(imageUrls, 2)
    ]);

    // Calculate totals with fallback for missing data
    const totalPlaying = gameResults.reduce((sum, g) => sum + (g?.playing || 0), 0);
    const totalVisits = gameResults.reduce((sum, g) => sum + (g?.visits || 0), 0);
    const totalMembers = groupResults.reduce((sum, g) => sum + (g?.groupDetails?.memberCount || 0), 0);

    const logData = {
      timestamp: new Date(),
      games: gameResults.length > 0 ? gameResults : details.map(game => ({
        universeId: game.id,
        name: game.name,
        playing: 0,
        visits: 0
      })),
      groups: groupResults.length > 0 ? groupResults : groupDetails.map(group => ({
        id: group.id,
        name: 'Group',
        groupDetails: { memberCount: 0 }
      })),
      images: imageResults.length > 0 ? imageResults : details.map(game => ({
        id: game.id,
        name: game.name,
        media: []
      })),
      totalPlaying,
      totalVisits,
      totalMembers,
    };

    // Save to database
    try {
      await Log.create(logData);
      console.log("✅ Log saved to MongoDB and cache updated.");
    } catch (dbError) {
      console.warn("⚠️ Database save failed:", dbError.message);
    }

    // Update cache
    setCachedData(logData);

    return logData;
  } catch (error) {
    console.error("❌ Fetch failed:", error.message);

    // Use fallback data when all APIs fail
    const fallbackData = createFallbackData();
    setCachedData(fallbackData);

    try {
      await Log.create(fallbackData);
      console.log("✅ Fallback data saved to MongoDB.");
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

setInterval(fetchAllData, 60 * 60 * 1000); // every hour

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
  const latest = await Log.findOne().sort({ timestamp: -1 });
  if (!latest) {
    return res.status(503).json({ error: "Data not available yet." });
  }

  setCachedData(latest);
  res.set('Cache-Control', 'public, max-age=900');
  res.json(latest);
}));

app.get("/proxy/logs", asyncHandler(async (_, res) => {
  const logs = await Log.find().sort({ timestamp: -1 }).limit(50); // Limit for performance
  res.set('Cache-Control', 'public, max-age=900');
  res.json(logs);
}));

app.get("/proxy/groups", asyncHandler(async (_, res) => {
  const cached = getCachedData();
  if (cached) {
    res.set('Cache-Control', 'public, max-age=900');
    return res.json(cached.groups);
  }

  const latest = await Log.findOne().sort({ timestamp: -1 });
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

  const latest = await Log.findOne().sort({ timestamp: -1 });
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

  const latest = await Log.findOne().sort({ timestamp: -1 });
  if (!latest) {
    return res.status(503).json({ error: "Data not available yet." });
  }

  setCachedData(latest);
  const { totalPlaying, totalVisits, totalMembers } = latest;
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ totalPlaying, totalVisits, totalMembers });
}));

app.get("/", async (_, res) => {
  res.json(
    "Hello World this is ggg backend if ur not ggg uhhh u probably don't have the endpoints so this is kind of useless soz!"
  );
});

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

  const latest = await Log.findOne().sort({ timestamp: -1 });
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
  await fetchAllData();
  res.json({ message: "Data refreshed successfully.", timestamp: new Date() });
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

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Database connection with options
mongoose.connection.on('connected', async () => {
  console.log('✅ Connected to MongoDB');
  // Create indexes for performance
  try {
    await Log.collection.createIndex({ timestamp: -1 });
    console.log('✅ Database indexes created');
  } catch (err) {
    console.warn('⚠️ Index creation failed:', err.message);
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});
