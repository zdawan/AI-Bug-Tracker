// routes/developerRoutes.js
import { Router } from "express";
import {
  createDeveloper,
  getDeveloperByEmail,
  getBugsForDeveloper,
} from "../controllers/developerController.js";

const router = Router();

router.post("/", createDeveloper); // create dev
router.get("/email/:email", getDeveloperByEmail); // login by email
router.get("/:id/bugs", getBugsForDeveloper); // dev's bugs

export default router;
