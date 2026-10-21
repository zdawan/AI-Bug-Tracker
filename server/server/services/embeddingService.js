import fetch from "node-fetch";

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL = "sentence-transformers/all-mpnet-base-v2"; // good tradeoff between speed & accuracy

// Hugging Face embedding endpoint
const API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${MODEL}`;

export async function getEmbedding(text) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Hugging Face Embedding API error: ${err}`);
    }

    const data = await res.json();
    // Returns [vector] or [[vector]] depending on API
    return Array.isArray(data[0]) ? data[0] : data;
  } catch (error) {
    console.error("❌ Error getting embedding:", error.message);
    return [];
  }
}

// Cosine similarity between two vectors
export function cosineSimilarity(vecA, vecB) {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] ** 2;
    magB += vecB[i] ** 2;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
