import Bug from "../models/Bug.js";
import {
  summarizeBug,
  generateTags,
  predictSeverity,
} from "../services/nlpService.js";
import { findDuplicateBug } from "../services/duplicateCheckService.js";
import { sendEmail } from "../utils/sendMail.js";

export const createBug = async (req, res) => {
  try {
    const { title, description, reporterEmail, testUrl } = req.body;

    // ✅ Handle screenshot if uploaded
    const screenshotPath = req.file ? `/uploads/${req.file.filename}` : null;

    // AI-generated fields
    const summary = await summarizeBug(description);
    const tags = await generateTags(description);
    let severity = await predictSeverity(description);

    // ✅ Check for duplicates (summary + title + testUrl)
    const duplicate = await findDuplicateBug(summary, title, testUrl);

    if (duplicate) {
      // 🟢 NEW: check if bug is already resolved (Closed)
      if (duplicate.status === "Closed") {
        return res.status(400).json({
          message: `This bug has already been resolved. Please verify the fix before reporting again.`,
          resolvedInfo: {
            id: duplicate._id,
            title: duplicate.title,
            resolvedAt: duplicate.updatedAt,
            severity: duplicate.severity,
          },
        });
      }

      duplicate.reports += 1;

      // Escalate severity dynamically
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

      // Add screenshot if new one is provided
      if (screenshotPath) {
        duplicate.screenshot = screenshotPath;
      }

      duplicate.severity = severity;
      await duplicate.save();

      return res.status(200).json({
        message:
          "Duplicate bug found (same URL), updated report count & severity",
        bug: duplicate,
      });
    }

    // ✅ Create new bug if no duplicate found
    const newBug = new Bug({
      title,
      description,
      summary,
      tags,
      severity,
      reporters: reporterEmail ? [reporterEmail] : [],
      reports: 1,
      testUrl,
      screenshot: screenshotPath, // ✅ save screenshot path
    });

    await newBug.save();
    res.status(201).json(newBug);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Resolve a bug (mark as Closed)
export const resolveBug = async (req, res) => {
  try {
    const { id } = req.params;
    const { sendMail } = req.body;
    const bug = await Bug.findById(id);

    if (!bug) {
      return res.status(404).json({ error: "Bug not found" });
    }

    bug.status = "Closed";
    await bug.save();
    if (sendMail && bug.reporters?.length > 0) {
      const subject = `✅ Bug Resolved: ${bug.title}`;
      const text = `
        Hello Tester,
        
        The bug you reported has been marked as resolved:
        Title: ${bug.title}
        URL: ${bug.testUrl || "N/A"}
        Severity: ${bug.severity}

        Description:
        ${bug.description}

        Thank you for helping improve the system!
        
        - Bug Tracker AI System
      `;
      await sendEmail(bug.reporters.join(","), subject, text);
    }

    res.status(200).json({ message: "Bug marked as resolved", bug });
  } catch (error) {
    console.error("Error resolving bug:", error);
    res.status(500).json({ error: "Failed to resolve bug" });
  }
};
