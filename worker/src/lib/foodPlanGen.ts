import type { Env } from "../types";
import { generateJson } from "./aiText";
import { getNutritionProfile } from "./nutritionProfile";

export interface GeneratedMeal {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GeneratedPlan {
  meals: GeneratedMeal[];
}

const SCHEMA = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
          name: { type: "string" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
        },
        required: ["mealType", "name", "calories", "protein", "carbs", "fat"],
      },
    },
  },
  required: ["meals"],
};

const SYSTEM_PROMPT = `You suggest a realistic one-day meal plan for a fitness tracking app's user. Given
daily targets for calories and macros (grams of protein/carbs/fat) and any dietary preference, propose
breakfast, lunch, dinner, and optionally one snack, with specific dish/food names (not vague categories)
and your best estimate of each meal's calories and macros. The meals' totals should land close to the
stated targets. Respond with nothing but the JSON object described.`;

const VALID_MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function generateFoodPlan(env: Env, userId: number, dietaryPreference?: string): Promise<GeneratedMeal[]> {
  const profile = await getNutritionProfile(env, userId);
  const targets = profile
    ? `Target calories: ${profile.target_kcal} kcal. Target protein: ${profile.target_protein_g}g. Target carbs: ${profile.target_carbs_g}g. Target fat: ${profile.target_fat_g}g.`
    : "No specific targets set — assume a typical active adult, around 2200 kcal.";

  const userPrompt = `${targets}${dietaryPreference ? `\nDietary preference: ${dietaryPreference}` : ""}`;

  const generated = await generateJson<GeneratedPlan>(env, SYSTEM_PROMPT, userPrompt, SCHEMA);
  if (!Array.isArray(generated.meals) || generated.meals.length === 0) {
    throw new Error("Model returned no meals.");
  }

  return generated.meals.map((m) => ({
    mealType: VALID_MEAL_TYPES.has(m.mealType) ? m.mealType : "snack",
    name: typeof m.name === "string" && m.name.trim() ? m.name.trim().slice(0, 150) : "Suggested meal",
    calories: toNumber(m.calories),
    protein: toNumber(m.protein),
    carbs: toNumber(m.carbs),
    fat: toNumber(m.fat),
  }));
}
