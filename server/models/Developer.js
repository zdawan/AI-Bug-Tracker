import mongoose from "mongoose";

const developerSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true, index: true },
    assignedUrls: { type: [String], default: [] }, // sites this dev handles
  },
  { timestamps: true }
);

export default mongoose.model("Developer", developerSchema);
