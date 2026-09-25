import type { Env } from "../types";

// Moondream (Apache-2.0, no geographic usage restriction) rather than a Meta
// Llama vision model — Llama 3.2/4's Acceptable Use Policy explicitly bars
// use by individuals/companies domiciled in the EU, which this app can't
// assume its users aren't.
const MODEL = "@cf/moondream/moondream3.1-9B-A2B";

const QUESTION = `Read the nutrition facts label in this photo. Extract the product name (if
visible) and the nutrition values PER 100g or PER 100ml — convert per-serving values to
per-100g if that's all that's shown, using the serving size on the label. Respond with ONLY
a single JSON object, no markdown, no explanation, in exactly this shape:
{"name": string | null, "caloriesPer100g": number, "proteinPer100g": number, "carbsPer100g": number, "fatPer100g": number}
If a value truly isn't visible on the label, use 0. Do not guess a brand name, only read what's printed.`;

export interface OcrResult {
  name: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model response.");
  return JSON.parse(match[0]);
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function extractNutritionFromLabel(
  env: Env,
  imageBytes: ArrayBuffer,
  contentType: string
): Promise<OcrResult> {
  const base64 = Buffer.from(imageBytes).toString("base64");
  const dataUri = `data:${contentType || "image/jpeg"};base64,${base64}`;

  const output = await env.AI.run(MODEL, {
    task: "query",
    image: dataUri,
    question: QUESTION,
    max_tokens: 512,
  });

  const text = output.answer;
  if (!text) throw new Error("Empty response from vision model.");

  const parsed = extractJson(text) as Record<string, unknown>;
  return {
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : null,
    caloriesPer100g: toNumber(parsed.caloriesPer100g),
    proteinPer100g: toNumber(parsed.proteinPer100g),
    carbsPer100g: toNumber(parsed.carbsPer100g),
    fatPer100g: toNumber(parsed.fatPer100g),
  };
}
