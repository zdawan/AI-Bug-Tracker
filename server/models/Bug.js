import mongoose from "mongoose";

const bugSchema = new mongoose.Schema(
  {
    testUrl: String,
    title: { type: String, required: true },
    description: { type: String, required: true },
    summary: { type: String },
    tags: { type: [String] },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Closed"],
      default: "Open",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reports: { type: Number, default: 1 }, // Number of times reported
    reporters: [{ type: String }], // User IDs or emails
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

// Enable text search on description & summary
bugSchema.index({ description: "text", summary: "text" });

export default mongoose.model("Bug", bugSchema);
