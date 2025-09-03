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

// Security and performance middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://yourdomain.com'];
app.use(cors({ origin: allowedOrigins }));
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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

mongoose.connect(MONGO_URI);
mongoose.connection.once("open", () => console.log("✅ Connected to MongoDB"));
mongoose.connection.on("error", console.error);


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, retries = 3) => {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response;
  } catch (err) {
    if (err.response?.status === 429 && retries > 0) {
      console.warn("⏳ Rate limited. Retrying...");
      await sleep(1000);
      return fetchWithRetry(url, retries - 1);
    } else {
      throw err;
    }
  }
};

// Concurrent fetch with rate limiting
const fetchConcurrentWithLimit = async (urls, maxConcurrent = 3) => {
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
    
    // Rate limiting between batches
    if (i + maxConcurrent < urls.length) {
      await sleep(500);
    }
  }
  return results;
};

// Cache management
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

    // Fetch all data concurrently
    const [gameResults, groupResults, imageResults] = await Promise.all([
      fetchConcurrentWithLimit(gameUrls, 3),
      fetchConcurrentWithLimit(groupUrls, 3),
      fetchConcurrentWithLimit(imageUrls, 3)
    ]);

    // Calculate totals
    const totalPlaying = gameResults.reduce((sum, g) => sum + (g.playing || 0), 0);
    const totalVisits = gameResults.reduce((sum, g) => sum + (g.visits || 0), 0);
    const totalMembers = groupResults.reduce((sum, g) => sum + (g.groupDetails.memberCount || 0), 0);

    const logData = {
      timestamp: new Date(),
      games: gameResults,
      groups: groupResults,
      images: imageResults,
      totalPlaying,
      totalVisits,
      totalMembers,
    };

    // Save to database
    await Log.create(logData);
    
    // Update cache
    setCachedData(logData);

    console.log("✅ Log saved to MongoDB and cache updated.");
    return logData;
  } catch (error) {
    console.error("❌ Fetch failed:", error.message);
    throw error;
  }
};

// Initial fetch and interval
fetchAllData();
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
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    return res.json(cached);
  }
  
  // Fallback to database
  const latest = await Log.findOne().sort({ timestamp: -1 });
  if (!latest) {
    return res.status(503).json({ error: "Data not available yet." });
  }
  
  setCachedData(latest);
  res.set('Cache-Control', 'public, max-age=300');
  res.json(latest);
}));

app.get("/proxy/logs", asyncHandler(async (_, res) => {
  const logs = await Log.find().sort({ timestamp: -1 }).limit(50); // Limit for performance
  res.set('Cache-Control', 'public, max-age=300');
  res.json(logs);
}));

app.get("/proxy/groups", asyncHandler(async (_, res) => {
  const cached = getCachedData();
  if (cached) {
    res.set('Cache-Control', 'public, max-age=300');
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
    res.set('Cache-Control', 'public, max-age=300');
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
    res.set('Cache-Control', 'public, max-age=300');
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
    res.set('Cache-Control', 'public, max-age=300');
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
