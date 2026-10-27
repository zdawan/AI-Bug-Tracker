import Bug from "../models/Bug.js";
import {
  summarizeBug,
  generateTags,
  predictSeverity,
  generateCategory,
} from "../services/nlpService.js";
import { findDuplicateBug } from "../services/duplicateCheckService.js";
import { sendEmail } from "../utils/sendMail.js";

const SEVERITY_RANK = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const VALID_SEVERITIES = Object.keys(SEVERITY_RANK);

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function normalizeSeverity(severity) {
  return VALID_SEVERITIES.includes(severity) ? severity : "Low";
}

function getEscalatedSeverity(currentSeverity, predictedSeverity, reportCount) {
  const current = normalizeSeverity(currentSeverity);
  const predicted = normalizeSeverity(predictedSeverity);

  // Never downgrade a bug because a later report receives a lower AI score.
  let result =
    SEVERITY_RANK[current] >= SEVERITY_RANK[predicted] ? current : predicted;

  // Escalate based on the cumulative number of reports.
  if (reportCount >= 10) {
    result = "High";
  } else if (reportCount >= 5 && result === "Low") {
    result = "Medium";
  }

  return result;
}

function normalizeCategory(categoryResult) {
  if (typeof categoryResult === "string" && categoryResult.trim()) {
    return categoryResult.trim();
  }

  if (
    categoryResult &&
    typeof categoryResult.primary === "string" &&
    categoryResult.primary.trim()
  ) {
    return categoryResult.primary.trim();
  }

  if (
    Array.isArray(categoryResult) &&
    typeof categoryResult[0] === "string" &&
    categoryResult[0].trim()
  ) {
    return categoryResult[0].trim();
  }

  return "UI Bug";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------
// CREATE BUG
// ---------------------------------------------------------

export const createBug = async (req, res) => {
  try {
    const { title, description, testUrl } = req.body;
    const reporterEmail = normalizeEmail(req.body.reporterEmail);

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        message: "Bug title and description are required.",
      });
    }

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const normalizedTestUrl = typeof testUrl === "string" ? testUrl.trim() : "";

    const screenshotPath = req.file ? `/uploads/${req.file.filename}` : null;

    // Generate AI-assisted report metadata.
    const [summary, tags, predictedSeverity, categoryResult] =
      await Promise.all([
        summarizeBug(normalizedDescription),
        generateTags(normalizedDescription),
        predictSeverity(normalizedDescription),
        generateCategory(`${normalizedTitle}. ${normalizedDescription}`),
      ]);

    const severity = normalizeSeverity(predictedSeverity);
    const category = normalizeCategory(categoryResult);

    // First duplicate check: exact title, category, and URL.
    const categoryDuplicate = await Bug.findOne({
      testUrl: normalizedTestUrl,
      category,
      title: normalizedTitle,
    });

    if (categoryDuplicate) {
      categoryDuplicate.reports = (categoryDuplicate.reports || 1) + 1;

      if (reporterEmail) {
        const existingReporters = (categoryDuplicate.reporters || []).map(
          normalizeEmail,
        );

        if (!existingReporters.includes(reporterEmail)) {
          categoryDuplicate.reporters.push(reporterEmail);
        }
      }

      if (screenshotPath) {
        categoryDuplicate.screenshot = screenshotPath;
      }

      categoryDuplicate.severity = getEscalatedSeverity(
        categoryDuplicate.severity,
        severity,
        categoryDuplicate.reports,
      );

      await categoryDuplicate.save();

      return res.status(200).json({
        message:
          "A matching bug was found. The existing report has been updated.",
        bug: categoryDuplicate,
      });
    }

    // Second duplicate check: existing similarity-based service.
    const duplicate = await findDuplicateBug(
      summary,
      normalizedTitle,
      normalizedTestUrl,
    );

    if (duplicate) {
      if (duplicate.status === "Closed") {
        return res.status(400).json({
          message:
            "This bug has already been resolved. Please verify the fix before reporting again.",
          resolvedInfo: {
            id: duplicate._id,
            title: duplicate.title,
            resolvedAt: duplicate.updatedAt,
            severity: duplicate.severity,
          },
        });
      }

      duplicate.reports = (duplicate.reports || 1) + 1;

      if (reporterEmail) {
        const existingReporters = (duplicate.reporters || []).map(
          normalizeEmail,
        );

        if (!existingReporters.includes(reporterEmail)) {
          duplicate.reporters.push(reporterEmail);
        }
      }

      if (screenshotPath) {
        duplicate.screenshot = screenshotPath;
      }

      duplicate.severity = getEscalatedSeverity(
        duplicate.severity,
        severity,
        duplicate.reports,
      );

      await duplicate.save();

      return res.status(200).json({
        message:
          "A duplicate bug was found. The existing report count and severity have been updated.",
        bug: duplicate,
      });
    }

    // Create a new report when no duplicate is found.
    const newBug = new Bug({
      title: normalizedTitle,
      description: normalizedDescription,
      summary,
      category,
      tags: Array.isArray(tags) ? tags : [],
      severity,
      reporters: reporterEmail ? [reporterEmail] : [],
      reports: 1,
      testUrl: normalizedTestUrl,
      screenshot: screenshotPath,
    });

    await newBug.save();

    return res.status(201).json({
      message: "Bug report created successfully.",
      bug: newBug,
    });
  } catch (error) {
    console.error("Error creating bug:", error);

    return res.status(500).json({
      message: "Failed to create the bug report.",
    });
  }
};

// ---------------------------------------------------------
// RESOLVE BUG
// ---------------------------------------------------------

export const resolveBug = async (req, res) => {
  try {
    const { id } = req.params;
    const shouldSendEmail = req.body?.sendMail === true;

    if (!id) {
      return res.status(400).json({
        message: "Bug ID is required.",
      });
    }

    const bug = await Bug.findById(id);

    if (!bug) {
      return res.status(404).json({
        message: "Bug not found.",
      });
    }

    if (bug.status === "Closed") {
      return res.status(200).json({
        message: "This bug is already resolved.",
        bug,
      });
    }

    bug.status = "Closed";
    await bug.save();

    let emailSent = false;

    if (shouldSendEmail && bug.reporters?.length > 0) {
      const recipients = [
        ...new Set(bug.reporters.map(normalizeEmail).filter(Boolean)),
      ];

      if (recipients.length > 0) {
        const subject = `Bug Resolved: ${bug.title}`;

        const text = [
          "Hello Tester,",
          "",
          "The bug you reported has been marked as resolved:",
          "",
          `Title: ${bug.title}`,
          `URL: ${bug.testUrl || "N/A"}`,
          `Severity: ${bug.severity}`,
          "",
          "Description:",
          bug.description || "No description provided.",
          "",
          "Thank you for helping improve the system!",
          "",
          "- Bug Tracker AI System",
        ].join("\n");

        try {
          await sendEmail(recipients.join(","), subject, text);
          emailSent = true;
        } catch (emailError) {
          // Resolution is saved even if the notification fails.
          console.error("Failed to send bug resolution email:", emailError);
        }
      }
    }

    return res.status(200).json({
      message: "Bug marked as resolved.",
      emailSent,
      bug,
    });
  } catch (error) {
    console.error("Error resolving bug:", error);

    return res.status(500).json({
      message: "Failed to resolve bug.",
    });
  }
};

// ---------------------------------------------------------
// GET BUGS BY REPORTER EMAIL
// ---------------------------------------------------------

export const getBugsByReporter = async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);

    if (!email) {
      return res.status(400).json({
        message: "Reporter email is required.",
      });
    }

    const emailPattern = escapeRegex(email);

    const bugs = await Bug.find({
      reporters: {
        $regex: `^${emailPattern}$`,
        $options: "i",
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      count: bugs.length,
      bugs,
    });
  } catch (error) {
    console.error("Failed to fetch reporter bugs:", error);

    return res.status(500).json({
      message: "Unable to load reports right now.",
    });
  }
};
