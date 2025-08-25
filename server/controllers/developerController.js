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

    const bugs = await Bug.find({ testUrl: { $in: dev.assignedUrls } }).sort({
      createdAt: -1,
    });
    res.json(bugs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
