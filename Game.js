import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  universeId: Number,
  name: String,
  playing: Number,
  visits: Number,
  maxPlayers: Number,
  created: String,
  updated: String,
  creator: Object,
  price: Number,
  genre: String,
  isPlayable: Boolean,
  timestamp: {
    type: Date,
    default: Date.now, // ✅ record when this data was logged
  },
});

export default mongoose.model("Game", gameSchema);
