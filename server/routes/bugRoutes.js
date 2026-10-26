import express from "express";
import {
  createBug,
  resolveBug,
  getBugsByReporter,
} from "../controllers/bugController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.get("/", getBugsByReporter);
router.post("/", upload.single("screenshot"), createBug);
router.patch("/:id/resolve", resolveBug);

export default router;
