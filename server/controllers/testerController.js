import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import jwt from "jsonwebtoken";
import { promisify } from "util";
import TesterOtp from "../models/TesterOtp.js";
import { sendEmail } from "../utils/sendMail.js";

const scrypt = promisify(scryptCallback);
const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_RESEND_INTERVAL_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getEmailError(email) {
  if (!email) return "Please enter your email address.";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return "Please enter a valid email address.";
  }
  return "";
}

async function hashOtp(otp) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(otp, salt, 64);
  return `${salt.toString("hex")}.${derivedKey.toString("hex")}`;
}

async function verifyOtpHash(otp, storedHash) {
  const [saltHex, expectedHex] = storedHash.split(".");
  if (!saltHex || !expectedHex || !/^[a-f\d]+$/i.test(saltHex)) return false;

  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== 64) return false;

  const actual = await scrypt(otp, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

function isJwtConfigured() {
  return typeof process.env.JWT_SECRET === "string" &&
    process.env.JWT_SECRET.trim().length >= 32;
}

export async function sendOtp(req, res) {
  const email = normalizeEmail(req.body?.email);
  const emailError = getEmailError(email);

  if (emailError) {
    return res.status(400).json({ message: emailError });
  }

  if (!isJwtConfigured()) {
    console.error("Tester OTP configuration is missing a strong JWT_SECRET.");
    return res.status(503).json({
      message: "Tester sign-in is temporarily unavailable. Please try again later.",
    });
  }

  try {
    const now = new Date();
    const activeOtp = await TesterOtp.findOne({
      email,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (
      activeOtp &&
      now.getTime() - new Date(activeOtp.createdAt).getTime() <
        OTP_RESEND_INTERVAL_MS
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another verification code.",
      });
    }

    const otp = String(randomInt(100000, 1000000));
    const otpHash = await hashOtp(otp);

    await TesterOtp.deleteMany({ email });
    const savedOtp = await TesterOtp.create({
      email,
      otpHash,
      expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
      attempts: 0,
    });

    try {
      await sendEmail(
        email,
        "Your Bug Tracker verification code",
        [
          "Your Bug Tracker tester sign-in code is:",
          "",
          otp,
          "",
          "This code expires in 10 minutes and can only be used once.",
          "If you did not request this code, you can ignore this email.",
        ].join("\n"),
        `<p>Your Bug Tracker tester sign-in code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes and can only be used once.</p><p>If you did not request this code, you can ignore this email.</p>`,
      );
    } catch (error) {
      await TesterOtp.deleteOne({ _id: savedOtp._id });
      console.error(
        "Tester OTP email delivery failed:",
        error?.code || "EMAIL_DELIVERY_FAILED",
      );
      return res.status(503).json({
        message: "Could not send a verification email. Check the email settings and try again.",
      });
    }

    return res.status(200).json({
      message: "A verification code was sent to your email address.",
    });
  } catch (error) {
    console.error("Tester OTP request failed:", error?.code || error?.name);
    return res.status(500).json({
      message: "Could not start tester sign-in. Please try again.",
    });
  }
}

export async function verifyOtp(req, res) {
  const email = normalizeEmail(req.body?.email);
  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
  const emailError = getEmailError(email);

  if (emailError) {
    return res.status(400).json({ message: emailError });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      message: "Enter the complete 6-digit verification code.",
    });
  }

  if (!isJwtConfigured()) {
    console.error("Tester OTP configuration is missing a strong JWT_SECRET.");
    return res.status(503).json({
      message: "Tester sign-in is temporarily unavailable. Please try again later.",
    });
  }

  try {
    const record = await TesterOtp.findOneAndUpdate(
      {
        email,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: OTP_MAX_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      {
        new: true,
        sort: { createdAt: -1 },
      },
    );

    if (!record) {
      return res.status(400).json({
        message: "The code is missing or expired. Request a new verification code.",
      });
    }

    const matches = await verifyOtpHash(otp, record.otpHash);
    if (!matches) {
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        await TesterOtp.deleteOne({ _id: record._id });
        return res.status(400).json({
          message: "Too many incorrect attempts. Request a new verification code.",
        });
      }

      return res.status(400).json({
        message: "The verification code is incorrect or expired.",
      });
    }

    const token = jwt.sign(
      {
        email,
        role: "tester",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
        issuer: "ai-bug-tracker",
        audience: "tester",
      },
    );

    await TesterOtp.deleteMany({ email });

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Tester OTP verification failed:", error?.code || error?.name);
    return res.status(500).json({
      message: "Could not verify the code. Please try again.",
    });
  }
}
