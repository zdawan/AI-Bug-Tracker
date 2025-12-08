import fetch from "node-fetch";

const HF_API_KEY = process.env.HF_API_KEY;

// 🧩 Generic helper for Hugging Face API calls
async function callHuggingFace(model, input) {
  const res = await fetch(
    `https://router.huggingface.co/hf-inference/models/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!res.ok) {
    throw new Error(`Hugging Face API error: ${await res.text()}`);
  }

  return res.json();
}

// 📝 Summarization
export async function summarizeBug(description) {
  const data = await callHuggingFace("facebook/bart-large-cnn", {
    inputs: description,
    parameters: { max_length: 60, min_length: 10 },
  });
  return data[0]?.summary_text || description;
}

// 🏷️ Tag generation (zero-shot classification)
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

  try {
    const data = await callHuggingFace(
      "typeform/distilbert-base-uncased-mnli",
      {
        inputs: description,
        parameters: { candidate_labels: labels },
      }
    );

    console.log("HF raw category response =>", data);

    // HF is returning flat array: [{label, score}, ...]
    if (Array.isArray(data) && data.length > 0 && data[0].label) {
      const sorted = data.sort((a, b) => b.score - a.score); // highest score wins
      return sorted[0].label; // return best category
    }

    return "General Bug";
  } catch (err) {
    console.error("generateCategory ERROR:", err.message);
    return "General Bug";
  }
}




// 🏷️ Tag generation (zero-shot classification)
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

  try {
    const data = await callHuggingFace(
      "typeform/distilbert-base-uncased-mnli",
      {
        inputs: description,
        parameters: { candidate_labels: labels },
      }
    );

    console.log("HF raw tags response =>", data);

    // HF returns: [{label, score}, {label, score}, ...]
    if (Array.isArray(data) && data.length > 0 && data[0].label) {
      // Sort by score (descending)
      const sorted = data.sort((a, b) => b.score - a.score);

      // Return top 3 relevant tags (you can adjust this)
      return sorted.slice(0, 3).map((item) => item.label);
    }

    return [];
  } catch (err) {
    console.error("generateTags ERROR:", err.message);
    return [];
  }
}


// 🚦 Improved Severity Prediction
export async function predictSeverity(description, reports = 0) {
  const labels = ["Low", "Medium", "High"];
  const data = await callHuggingFace("facebook/bart-large-mnli", {
    inputs: `Classify this bug as Low, Medium, or High severity: ${description}`,
    parameters: { candidate_labels: labels },
  });

  if (!data || !data.labels || !data.scores) return "Medium";

  let severity = data.labels[0];
  const confidence = data.scores[0];

  // 🧠 Adjust severity based on description keywords
  const desc = description.toLowerCase();

  if (
    desc.includes("crash") ||
    desc.includes("error") ||
    desc.includes("fail") ||
    desc.includes("not working") ||
    desc.includes("security") ||
    desc.includes("data loss")
  ) {
    severity = "High";
  } else if (
    desc.includes("slow") ||
    desc.includes("delay") ||
    desc.includes("performance")
  ) {
    severity = "Medium";
  } else if (
    desc.includes("typo") ||
    desc.includes("alignment") ||
    desc.includes("color") ||
    desc.includes("font") ||
    desc.includes("ui") ||
    desc.includes("button") ||
    desc.includes("minor")
  ) {
    severity = "Low";
  }

  // ⚙️ Adjust based on confidence score
  if (confidence < 0.5 && severity === "Medium") severity = "Low";

  // 📊 Adjust based on number of reports
  if (reports >= 10 && severity !== "High") severity = "High";
  if (reports < 3 && severity === "High") severity = "Medium";

  return severity;
}

// import fetch from "node-fetch";

// const HF_API_KEY = process.env.HF_API_KEY;

// // Generic helper for API calls
// async function callHuggingFace(model, input) {
//   const res = await fetch(
//     `https://router.huggingface.co/hf-inference/models/${model}`,
//     {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${HF_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(input),
//     }
//   );

//   if (!res.ok) {
//     throw new Error(`Hugging Face API error: ${await res.text()}`);
//   }

//   return res.json();
// }

// // Summarization
// export async function summarizeBug(description) {
//   // Change model name here if you want a faster/smaller one
//   const data = await callHuggingFace("facebook/bart-large-cnn", {
//     inputs: description,
//     parameters: { max_length: 60, min_length: 10 }, // optional tuning
//   });
//   return data[0]?.summary_text || description;
// }

// // Tag generation (zero-shot classification)
// export async function generateTags(description) {
//   const labels = [
//     "UI Bug",
//     "Backend",
//     "Database",
//     "Security",
//     "Performance",
//     "Developer",
//     "Internet Error",
//   ];
//   const data = await callHuggingFace("facebook/bart-large-mnli", {
//     inputs: description,
//     parameters: { candidate_labels: labels },
//   });
//   return data.labels || [];
// }

// // Severity prediction
// export async function predictSeverity(description, reports = 0) {
//   const labels = ["Low", "Medium", "High"];
//   const data = await callHuggingFace("facebook/bart-large-mnli", {
//     inputs: description,
//     parameters: { candidate_labels: labels },
//   });

//   const severity = data.labels?.[0] || "Medium";

//   // // Cap severity at Medium if reports < 3
//   // if (reports < 5 && severity === "High") {
//   //   severity = "High";
//   // }

//   return severity;
// }
