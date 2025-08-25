import Bug from "../models/Bug.js";
import { getEmbedding, cosineSimilarity } from "./embeddingService.js";

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\bcharges\b/g, "charge")
    .replace(/\btwice\b/g, "double")
    .replace(/\bcustomers\b/g, "customer")
    .replace(/\W+/g, " ")
    .trim();
}

function keywordOverlap(text1, text2) {
  const words1 = new Set(normalizeText(text1).split(" ").filter(Boolean));
  const words2 = new Set(normalizeText(text2).split(" ").filter(Boolean));
  const commonWords = [...words1].filter((w) => words2.has(w));
  const minLength = Math.min(words1.size, words2.size);
  return minLength > 0 ? commonWords.length / minLength : 0;
}

/**
 * Find a duplicate bug only if both:
 * - Title+summary similarity >= 0.5
 * - testUrl is the same
 */
export async function findDuplicateBug(summary, title = "", testUrl = "") {
  const bugs = await Bug.find();

  // Combine title + summary for better matching
  const combinedInput = `${title} ${summary}`;

  for (const bug of bugs) {
    // ✅ Check testUrl equality
    if (testUrl && bug.testUrl !== testUrl) {
      continue; // different URL → skip, treat as new bug
    }

    const combinedExisting = `${bug.title} ${bug.summary || ""}`;
    const overlap = keywordOverlap(combinedInput, combinedExisting);

    if (overlap >= 0.5) {
      // 50% match threshold
      console.log(`Duplicate found (same URL + similarity score: ${overlap})`);
      return bug;
    }
  }

  return null; // No duplicate found
}
