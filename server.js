import express from "express";
import axios from "axios";
import cors from "cors";
import { details, groupDetails } from "./details.js";

const app = express();
app.use(cors({ origin: "*" }));

let cachedData = [];
let groupData = [];
let totalPlaying = 0;
let totalVisits = 0;
let totalMembers = 0;

const fetchGameDetails = async () => {
  try {
    console.log("Fetching game details...");
    const responses = await Promise.all(
      details.map(async (game) => {
        const url = `https://games.roblox.com/v1/games?universeIds=${game.id}`;
        const response = await axios.get(url);
        const gameData = response.data.data[0] || {};

        totalPlaying += gameData.playing;
        totalVisits += gameData.visits;
        return {
          ...game,
          details: response.data.data[0] || {},
        };
      })
    );

    cachedData = responses;
  } catch (error) {
    console.error("Error fetching game details:", error.message);
  }
};

const fetchGroupDetails = async () => {
  try {
    console.log("Fetching group details...");
    const responses = await Promise.all(
      groupDetails.map(async (group) => {
        const url = `https://groups.roblox.com/v1/groups/${group.id}`;
        const response = await axios.get(url);
        const groupData = response.data || {};

        totalMembers += groupData.memberCount;

        return {
          ...group,
          groupDetails: response.data || {},
        };
      })
    );

    groupData = responses;
  } catch (error) {
    console.error("Error fetching group details:", error.message);
  }
};

fetchGroupDetails();
setInterval(fetchGroupDetails, 60 * 60 * 1000);
fetchGameDetails();
setInterval(fetchGameDetails, 60 * 60 * 1000);

app.get("/proxy/games", async (req, res) => {
  if (cachedData.length === 0) {
    return res
      .status(503)
      .json({ error: "Data is still loading, try again later." });
  }
  res.json(cachedData);
});

app.get("/proxy/groups", async (req, res) => {
  if (groupData.length === 0) {
    return res
      .status(503)
      .json({ error: "Data is still loading, try again later." });
  }
  res.json(groupData);
});

app.get("/proxy/total", async (req, res) => {
  res.json({ totalPlaying, totalVisits, totalMembers });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
