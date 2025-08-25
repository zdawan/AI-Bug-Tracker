import Bug from "../models/Bug.js";
import {
  summarizeBug,
  generateTags,
  predictSeverity,
} from "../services/nlpService.js";
import { findDuplicateBug } from "../services/duplicateCheckService.js";

export const createBug = async (req, res) => {
  try {
    const { title, description, reporterEmail, testUrl } = req.body;

    // AI-generated fields
    const summary = await summarizeBug(description);
    const tags = await generateTags(description);
    let severity = await predictSeverity(description);

    // ✅ Now also checks testUrl
    const duplicate = await findDuplicateBug(summary, title, testUrl);

    if (duplicate) {
      duplicate.reports += 1;

      // Escalate severity based on reports
      if (duplicate.reports >= 5 && severity.toLowerCase() === "low") {
        severity = "Medium";
      }
      if (duplicate.reports >= 10 && severity.toLowerCase() !== "high") {
        severity = "High";
      }

      // Track reporters uniquely
      if (reporterEmail && !duplicate.reporters.includes(reporterEmail)) {
        duplicate.reporters.push(reporterEmail);
      }

      duplicate.severity = severity;
      await duplicate.save();

      return res.status(200).json({
        message:
          "Duplicate bug found (same URL), updated report count & severity",
        bug: duplicate,
      });
    }

    // ✅ New bug if no duplicate for same URL
    const newBug = new Bug({
      title,
      description,
      summary,
      tags,
      severity,
      reporters: reporterEmail ? [reporterEmail] : [],
      reports: 1,
      testUrl, // save test URL
    });

    await newBug.save();
    res.status(201).json(newBug);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
