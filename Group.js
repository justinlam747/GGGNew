// Group.js
import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  id: Number,
  name: String,
  groupDetails: {
    type: Object,
    required: true,
  },
});

export default mongoose.model("Group", groupSchema);
