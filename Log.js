// Log.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  games: { type: Array, required: true },
  groups: { type: Array, required: true },
  images: { type: Array, default: [] },
  totalPlaying: { type: Number, default: 0 },
  totalVisits: { type: Number, default: 0 },
  totalMembers: { type: Number, default: 0 },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
});

export default mongoose.model("Log", logSchema);
