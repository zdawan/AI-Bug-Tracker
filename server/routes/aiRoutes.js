// routes/aiRoutes.js
import express from "express";
import puppeteer from "puppeteer";
import OpenAI from "openai";

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

    if (browser) await browser.close();

    const prompt = `
You are an expert UI inspector. Read the website content and find a specific UI element that likely has an issue.

⚠️ IMPORTANT:
- "title" must ONLY contain the exact UI element name.
- Do NOT write generic titles like "Issue Detected".
- The title should look like UI labels, e.g. "Login Button", "Sidebar Menu", "Checkout Form".

- "description" must contain the bug details and issue explanation.

Return STRICT JSON like:
{
  "title": "UI element name only",
  "description": "detailed explanation of the issue"
}

Website content:
${pageText}
`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let response = aiRes.choices[0].message.content;
    let output;

    try {
      output = JSON.parse(response);
    } catch {
      output = {
        title: "Possible Issue Detected",
        description: response,
      };
    }

    res.json({
      aiTitle: output.title,
      aiDescription: output.description,
      screenshotBase64,
      fileUrl: "/mnt/data/BugForm.jsx",
    });
  } catch (err) {
    console.error(err);
    if (browser)
      try {
        await browser.close();
      } catch {}
    res.status(500).json({ error: "AI analysis failed", details: err.message });
  }
});

// ✅ IMPORTANT FIX
export default router;
