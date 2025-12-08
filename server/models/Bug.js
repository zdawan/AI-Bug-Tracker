import mongoose from "mongoose";

const bugSchema = new mongoose.Schema(
  {
    testUrl: { type: String },
    category: {
      type: String,
      required: true,
      default: "General Bug",
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    summary: { type: String },
    tags: { type: [String], default: [] },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High"], // ✅ added Critical
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "Closed"], // ✅ extended
      default: "Open",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reports: { type: Number, default: 1 }, // Number of times reported
    reporters: [{ type: String }], // emails
    embedding: { type: [Number], default: [] },

    // ✅ New screenshot field
    screenshot: {
      type: String, // will store file path, e.g. "/uploads/1694971278123.png"
      default: null,
    },
  },
  { timestamps: true }
);

// Enable text search on description & summary
bugSchema.index({ description: "text", summary: "text" });

export default mongoose.model("Bug", bugSchema);
