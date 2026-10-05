import type { Env } from "../types";
import { generateJson } from "./aiText";

export interface GeneratedRecipe {
  title: string;
  ingredients: string[];
  steps: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    ingredients: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 20 },
    steps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 15 },
    calories: { type: "number" },
    protein: { type: "number" },
    carbs: { type: "number" },
    fat: { type: "number" },
  },
  required: ["title", "ingredients", "steps", "calories", "protein", "carbs", "fat"],
};

const SYSTEM_PROMPT = `You suggest a single dinner recipe for a fitness tracking app's user. Given any
stated dietary preference, ingredients they already have, and a time limit, propose one realistic,
cookable recipe: a title, an ingredient list with quantities, numbered steps, and your best estimate of
total calories and macros (grams of protein/carbs/fat) for one serving. Respond with nothing but the
JSON object described.`;

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
}

export async function generateRecipe(
  env: Env,
  input: { preference?: string; haveIngredients?: string; maxMinutes?: number }
): Promise<GeneratedRecipe> {
  const lines = [
    input.preference ? `Dietary preference: ${input.preference}` : null,
    input.haveIngredients ? `Ingredients already on hand: ${input.haveIngredients}` : null,
    input.maxMinutes ? `Time limit: ${input.maxMinutes} minutes` : null,
  ].filter(Boolean);
  const userPrompt = lines.length > 0 ? lines.join("\n") : "No specific preference — suggest a balanced, generally appealing dinner.";

  const generated = await generateJson<GeneratedRecipe>(env, SYSTEM_PROMPT, userPrompt, SCHEMA);
  const ingredients = toStringArray(generated.ingredients);
  const steps = toStringArray(generated.steps);
  if (ingredients.length === 0 || steps.length === 0) throw new Error("Model returned an incomplete recipe.");

  return {
    title: typeof generated.title === "string" && generated.title.trim() ? generated.title.trim().slice(0, 150) : "Suggested dinner",
    ingredients,
    steps,
    calories: toNumber(generated.calories),
    protein: toNumber(generated.protein),
    carbs: toNumber(generated.carbs),
    fat: toNumber(generated.fat),
  };
}
