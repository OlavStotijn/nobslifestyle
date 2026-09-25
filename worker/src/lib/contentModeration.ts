import type { Env } from "../types";

// Reuses the same Workers AI vision model as the nutrition-label OCR (see
// ocr.ts) as a lightweight safety classifier — no separate vendor, no extra
// binding. Not a substitute for a dedicated moderation pipeline at scale,
// but a real, functioning first line of defense for user-uploaded photos
// (post photos, progress photos) against nudity/sexual content/graphic
// violence before they ever reach R2 or another user's feed.
const MODEL = "@cf/moondream/moondream3.1-9B-A2B";

const QUESTION = `Look at this photo. Does it contain nudity, sexual content, graphic violence, gore, or other
content that would be inappropriate for a general-audience fitness and social app? Answer with exactly one
word: YES if it is inappropriate, or NO if it is fine.`;

export async function isImageAppropriate(env: Env, imageBytes: ArrayBuffer, contentType: string): Promise<boolean> {
  try {
    const base64 = Buffer.from(imageBytes).toString("base64");
    const dataUri = `data:${contentType || "image/jpeg"};base64,${base64}`;

    const output = await env.AI.run(MODEL, {
      task: "query",
      image: dataUri,
      question: QUESTION,
      max_tokens: 16,
    });

    const answer = (output.answer ?? "").trim().toUpperCase();
    // Fail closed only on an explicit YES — an ambiguous/empty response
    // shouldn't block a legitimate upload just because the model hedged.
    return !answer.startsWith("YES");
  } catch (err) {
    // If the classifier itself errors (model hiccup, timeout), don't block
    // the user's upload on an infrastructure problem — log and allow it.
    console.error("Content moderation check failed", err);
    return true;
  }
}
