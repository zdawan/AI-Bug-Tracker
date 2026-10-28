import express from "express";
import { sendOtp, verifyOtp } from "../controllers/testerController.js";
import verifyTesterToken from "../middleware/verifyTesterToken.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

router.get("/me", verifyTesterToken, (req, res) => {
  res.status(200).json({
    tester: req.tester,
  });
});

export default router;
