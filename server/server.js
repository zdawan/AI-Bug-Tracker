import dotenv from "dotenv";
import express from "express";
import path from "path";
import cors from "cors";
import { connectDB } from "./config/db.js";
import bugRoutes from "./routes/bugRoutes.js";
import developerRoutes from "./routes/developerRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "https://ai-bug-tracker-silk.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

// ✅ Serve uploaded screenshots
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/bugs", bugRoutes);
app.use("/api/developers", developerRoutes);
app.use("/api/ai", aiRoutes);

// Connect to MongoDB
connectDB();

// Simple test route
app.get("/", (req, res) => {
  res.send("✅ API is running — check terminal for DB connection status");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
