import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import bugRoutes from "./routes/bugRoutes.js";
import developerRoutes from "./routes/developerRoutes.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/bugs", bugRoutes);
app.use("/api/developers", developerRoutes);

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
