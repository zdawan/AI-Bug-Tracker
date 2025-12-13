// routes/aiRoutes.js
import express from "express";
import puppeteer from "puppeteer";
import OpenAI from "openai";
import Bug from "../models/Bug.js";
import { generateCategory } from "../services/nlpService.js";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/analyze", async (req, res) => {
  const { websiteUrl } = req.body;

  if (!websiteUrl) {
    return res.status(400).json({ error: "websiteUrl is required" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(websiteUrl, { waitUntil: "networkidle2", timeout: 30000 });

    const pageText = await page.evaluate(() => document.body.innerText);
    const screenshotBuffer = await page.screenshot({ type: "png" });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    await browser.close();

    // ⭐ NEW — Fetch ALL previously reported bugs for this URL
    const existingBugs = await Bug.find({ testUrl: websiteUrl });
    const reportedTitles = existingBugs.map((b) => b.title);
    const reportedDescriptions = existingBugs.map((b) => b.description);

    // ⭐ UPDATED AI PROMPT (prevents repeat bugs)
    const prompt = `
You are an expert UI inspector.

Extract up to 5 NEW and DIFFERENT UI or functionality bugs from the webpage text.

⚠️ VERY IMPORTANT — DO NOT REPEAT BUGS:
Below are bugs ALREADY reported for this page.
Do NOT return anything similar.

Already Reported Bug Titles:
${reportedTitles.join("\n")}

Already Reported Bug Descriptions:
${reportedDescriptions.join("\n")}

Your task:
- Return ONLY NEW bugs not similar to the above.
- Each bug must contain:
  "title": short UI element name (EXACT element)
  "description": a clear explanation of a NEW issue

Return STRICT JSON ONLY:

{
  "bugs": [
    { "title": "element name", "description": "issue details" }
  ]
}

Website Content:
${pageText}
`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let raw = aiRes.choices[0].message.content;
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON", raw });
    }

    const aiBugs = parsed.bugs || [];

    // ⭐ Process bugs — add category & duplicate flags
    const processedBugs = [];

    for (const bug of aiBugs) {
      const category = await generateCategory(bug.description);

      const exists = await Bug.findOne({
        testUrl: websiteUrl,
        title: bug.title,
        category,
      });

      processedBugs.push({
        title: bug.title,
        description: bug.description,
        category,
        duplicate: Boolean(exists),
      });
    }

    // ⭐ If ALL bugs are duplicates → no new bugs available
    const allDuplicates = processedBugs.every((b) => b.duplicate);

    if (allDuplicates) {
      return res.json({
        duplicate: true,
        message: "No NEW bugs found. All detected bugs are already reported.",
        bugs: processedBugs,
        screenshotBase64,
      });
    }

    // ⭐ Return ALL processed bugs (frontend chooses)
    return res.json({
      duplicate: false,
      bugs: processedBugs,
      screenshotBase64,
    });
  } catch (err) {
    console.error("AI ANALYZE ERROR:", err);

    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }

    return res.status(500).json({
      error: "AI analysis failed",
      details: err.message,
    });
  }
});

export default router;
