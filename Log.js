// Log.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  games: { type: Array, required: true },
  groups: { type: Array, required: true },
  images: { type: Array, default: [] },
  totalPlaying: Number,
  totalVisits: Number,
  totalMembers: Number,
});

export default mongoose.model("Log", logSchema);
