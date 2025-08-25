import express from "express";
import { createBug } from "../controllers/bugController.js";

const router = express.Router();

router.post("/", createBug);

export default router;
