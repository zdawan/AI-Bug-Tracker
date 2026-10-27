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

// Allowed frontend origins
const allowedOrigins = [
  "https://ai-bug-tracker-silk.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

// CORS must run before API routes
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server calls.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Parse JSON request bodies
app.use(express.json());

// Serve uploaded screenshots
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes
app.use("/api/bugs", bugRoutes);
app.use("/api/developers", developerRoutes);
app.use("/api/ai", aiRoutes);

// Health-check route
app.get("/", (req, res) => {
  res.status(200).send("API is running.");
});

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
