import type { Env } from "../types";

// Same model as ocr.ts, same reasoning: Moondream (Apache-2.0, no
// geographic usage restriction) rather than a Meta Llama vision model,
// whose Acceptable Use Policy bars use by anyone EU-domiciled.
const MODEL = "@cf/moondream/moondream3.1-9B-A2B";

const QUESTION = `Look at this photo of a meal. Identify each distinct food item visible and estimate
its quantity in grams and its nutrition values for that estimated quantity. Respond with ONLY a
single JSON object, no markdown, no explanation, in exactly this shape:
{"items": [{"name": string, "estimatedGrams": number, "calories": number, "protein": number, "carbs": number, "fat": number}]}
List each item separately (don't merge a plate into one entry) — e.g. rice, chicken, and broccoli on
one plate are three items. If you can't identify anything edible, respond with {"items": []}.`;

export interface MealScanItem {
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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

export async function scanMealPhoto(env: Env, imageBytes: ArrayBuffer, contentType: string): Promise<MealScanItem[]> {
  const base64 = Buffer.from(imageBytes).toString("base64");
  const dataUri = `data:${contentType || "image/jpeg"};base64,${base64}`;

  const output = await env.AI.run(MODEL, {
    task: "query",
    image: dataUri,
    question: QUESTION,
    max_tokens: 1024,
  });

  const text = output.answer;
  if (!text) throw new Error("Empty response from vision model.");

  const parsed = extractJson(text) as { items?: unknown };
  if (!Array.isArray(parsed.items)) throw new Error("Malformed response from vision model.");

  return parsed.items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Unknown item",
      estimatedGrams: toNumber(item.estimatedGrams),
      calories: toNumber(item.calories),
      protein: toNumber(item.protein),
      carbs: toNumber(item.carbs),
      fat: toNumber(item.fat),
    }));
}
