// controllers/developerController.js
import Developer from "../models/Developer.js";
import Bug from "../models/Bug.js";

export const createDeveloper = async (req, res) => {
  try {
    const dev = await Developer.create(req.body);
    res.status(201).json(dev);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getDeveloperByEmail = async (req, res) => {
  try {
    const dev = await Developer.findOne({ email: req.params.email });
    if (!dev) return res.status(404).json({ error: "Developer not found" });
    res.json(dev);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getBugsForDeveloper = async (req, res) => {
  try {
    const dev = await Developer.findById(req.params.id);
    if (!dev) return res.status(404).json({ error: "Developer not found" });

    // Developer assigned base URLs (example: ["https://app.base44.com"])
    const assignedBases = dev.assignedUrls.map((url) => {
      try {
        return new URL(url).origin; // extract only the base/origin
      } catch {
        return url;
      }
    });

    // Fetch all bugs
    const allBugs = await Bug.find().sort({ createdAt: -1 });

    // Filter bugs by matching base URL (IGNORES PATH)
    const filtered = allBugs.filter((b) => {
      try {
        const bugBase = new URL(b.testUrl).origin;
        return assignedBases.includes(bugBase);
      } catch {
        return false;
      }
    });

    res.json(filtered);
  } catch (err) {
    console.error("Developer bug fetch error:", err);
    res.status(500).json({ error: err.message });
  }
};
