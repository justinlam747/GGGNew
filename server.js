// server.js
import express from "express";
import axios from "axios";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { details, groupDetails } from "./details.js";
import Log from "./Log.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const app = express();
app.use(cors({ origin: "*" }));

mongoose.connect(MONGO_URI);
mongoose.connection.once("open", () => console.log("✅ Connected to MongoDB"));
mongoose.connection.on("error", console.error);

// Utils
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, retries = 3) => {
  try {
    return await axios.get(url);
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

// Main fetch function
const fetchAllData = async () => {
  try {
    console.log("🔄 Fetching all Roblox data...");

    const gameResults = [];
    for (const game of details) {
      const url = `https://games.roblox.com/v1/games?universeIds=${game.id}`;
      try {
        const response = await fetchWithRetry(url);
        const data = response.data.data[0] || {};
        gameResults.push({
          universeId: game.id,
          name: game.name,
          ...data,
        });
      } catch (err) {
        console.warn(`⚠️ Game fetch failed: ${game.name}`, err.message);
      }
      await sleep(250);
    }

    const totalPlaying = gameResults.reduce(
      (sum, g) => sum + (g.playing || 0),
      0
    );
    const totalVisits = gameResults.reduce(
      (sum, g) => sum + (g.visits || 0),
      0
    );

    const groupResults = [];
    for (const group of groupDetails) {
      const url = `https://groups.roblox.com/v1/groups/${group.id}`;
      try {
        const response = await fetchWithRetry(url);
        groupResults.push({
          id: group.id,
          name: group.name,
          groupDetails: response.data || {},
        });
      } catch (err) {
        console.warn(`⚠️ Group fetch failed: ${group.name}`, err.message);
      }
      await sleep(250);
    }

    const totalMembers = groupResults.reduce(
      (sum, g) => sum + (g.groupDetails.memberCount || 0),
      0
    );

    const imageResults = [];
    for (const game of details) {
      const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${game.id}&size=512x512&format=Png&isCircular=false
`;
      try {
        const response = await fetchWithRetry(url);
        imageResults.push({
          id: game.id,
          name: game.name,
          media: response.data.data || [],
        });
      } catch (err) {
        console.warn(`⚠️ Image fetch failed: ${game.name}`, err.message);
      }
      await sleep(250);
    }

    await Log.create({
      timestamp: new Date(),
      games: gameResults,
      groups: groupResults,
      images: imageResults,
      totalPlaying,
      totalVisits,
      totalMembers,
    });

    console.log("✅ Log saved to MongoDB.");
  } catch (error) {
    console.error("❌ Fetch failed:", error.message);
  }
};

// Initial fetch and interval
fetchAllData();
setInterval(fetchAllData, 60 * 60 * 1000); // every hour

// Routes
app.get("/proxy/latest", async (_, res) => {
  const latest = await Log.findOne().sort({ timestamp: -1 });
  if (!latest)
    return res.status(503).json({ error: "Data not available yet." });
  res.json(latest);
});

app.get("/proxy/logs", async (_, res) => {
  const logs = await Log.find().sort({ timestamp: -1 });
  res.json(logs);
});

app.get("/proxy/groups", async (_, res) => {
  const latest = await Log.findOne().sort({ timestamp: -1 });
  if (!latest)
    return res.status(503).json({ error: "Data not available yet." });
  res.json(latest.groups);
});

app.get("/proxy/images", async (_, res) => {
  const latest = await Log.findOne().sort({ timestamp: -1 });
  if (!latest)
    return res.status(503).json({ error: "Data not available yet." });
  res.json(latest.images);
});

app.get("/proxy/total", async (_, res) => {
  const latest = await Log.findOne().sort({ timestamp: -1 });
  if (!latest)
    return res.status(503).json({ error: "Data not available yet." });
  const { totalPlaying, totalVisits, totalMembers } = latest;
  res.json({ totalPlaying, totalVisits, totalMembers });
});

app.get("/", async (_, res) => {
  res.json(
    "Hello World this is ggg backend if ur not ggg uhhh u probably don't have the endpoints so this is kind of useless soz!"
  );
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
