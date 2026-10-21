import fetch from "node-fetch";

const HF_API_KEY = process.env.HF_API_KEY;

// ⏱️ Timeout helper
function withTimeout(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller;
}

// 🧩 SAFE Hugging Face helper (NEVER throws)
async function callHuggingFace(model, input) {
  try {
    const controller = withTimeout(15000); // 15s timeout

    const res = await fetch(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      }
    );

    // ❌ HF often returns HTML (504, 503)
    const text = await res.text();

    if (!res.ok) {
      console.warn("⚠️ HF API failed:", res.status);
      return null; // ✅ fallback instead of crash
    }

    // Try parsing JSON safely
    try {
      return JSON.parse(text);
    } catch {
      console.warn("⚠️ HF returned non-JSON");
      return null;
    }
  } catch (err) {
    console.warn("⚠️ HF request error:", err.message);
    return null;
  }
}

// 📝 Summarization (SAFE)
export async function summarizeBug(description) {
  const data = await callHuggingFace("facebook/bart-large-cnn", {
    inputs: description,
    parameters: { max_length: 60, min_length: 10 },
  });

  if (!data || !Array.isArray(data)) return description;
  return data[0]?.summary_text || description;
}

// 🏷️ Category generation (SAFE)
export async function generateCategory(description) {
  const labels = [
    "UI Bug",
    "Backend Bug",
    "Performance Bug",
    "Security Bug",
    "Database Bug",
    "Internet Error",
    "Developer Error",
    "General Bug",
  ];

  const data = await callHuggingFace("typeform/distilbert-base-uncased-mnli", {
    inputs: description,
    parameters: { candidate_labels: labels },
  });

  if (!Array.isArray(data)) return "General Bug";

  const sorted = data.sort((a, b) => b.score - a.score);
  return sorted[0]?.label || "General Bug";
}

// 🏷️ Tags generation (SAFE)
export async function generateTags(description) {
  const labels = [
    "UI Bug",
    "Backend Bug",
    "Database Bug",
    "Security Bug",
    "Performance Bug",
    "Developer Error",
    "Internet Error",
    "General Bug",
  ];

  const data = await callHuggingFace("typeform/distilbert-base-uncased-mnli", {
    inputs: description,
    parameters: { candidate_labels: labels },
  });

  if (!Array.isArray(data)) return [];

  const sorted = data.sort((a, b) => b.score - a.score);
  return sorted.slice(0, 3).map((d) => d.label);
}

// 🚦 Severity prediction (SAFE)
export async function predictSeverity(description, reports = 0) {
  let severity = "Medium"; // default fallback

  const data = await callHuggingFace("facebook/bart-large-mnli", {
    inputs: `Classify this bug as Low, Medium, or High severity: ${description}`,
    parameters: { candidate_labels: ["Low", "Medium", "High"] },
  });

  if (data?.labels?.length) {
    severity = data.labels[0];
  }

  const desc = description.toLowerCase();

  if (
    desc.includes("crash") ||
    desc.includes("security") ||
    desc.includes("data loss")
  ) {
    severity = "High";
  } else if (desc.includes("slow") || desc.includes("performance")) {
    severity = "Medium";
  } else if (
    desc.includes("typo") ||
    desc.includes("alignment") ||
    desc.includes("ui")
  ) {
    severity = "Low";
  }

  if (reports >= 10) severity = "High";
  if (reports < 3 && severity === "High") severity = "Medium";

  return severity;
}
