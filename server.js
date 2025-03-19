import express from "express";
import axios from "axios";
import cors from "cors";
import { details } from "./details.js"; // Import game list

const app = express();
app.use(cors({ origin: "*" }));

let cachedData = []; // Store game details in memory

// Fetch game details from Roblox API
const fetchGameDetails = async () => {
  try {
    console.log("Fetching game details...");
    const responses = await Promise.all(
      details.map(async (game) => {
        const url = `https://games.roblox.com/v1/games?universeIds=${game.id}`;
        const response = await axios.get(url);
        return {
          ...game, // Keep original data (id, name)
          details: response.data.data[0] || {}, // Add fetched details
        };
      })
    );

    cachedData = responses; // Update cached data
  } catch (error) {
    console.error("Error fetching game details:", error.message);
  }
};

// Fetch data immediately and update every hour
fetchGameDetails();
setInterval(fetchGameDetails, 60 * 60 * 1000); // Update every hour

// Endpoint to get all game details
app.get("/proxy/games", async (req, res) => {
  if (cachedData.length === 0) {
    return res
      .status(503)
      .json({ error: "Data is still loading, try again later." });
  }
  res.json(cachedData); // Return the latest stored data
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
