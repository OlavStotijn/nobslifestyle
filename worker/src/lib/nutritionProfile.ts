import type { Env } from "../types";
import { computeNutritionTargets, type ActivityLevel, type Goal, type Sex } from "./nutrition";

export interface NutritionProfileRow {
  user_id: number;
  sex: Sex;
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
  bmr_kcal: number;
  tdee_kcal: number;
  target_kcal: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  timezone: string;
  breakfast_end_time: string;
  lunch_end_time: string;
  dinner_end_time: string;
  onboarding_completed_at: string | null;
  updated_at: string;
}

export function publicNutritionProfile(p: NutritionProfileRow) {
  return {
    sex: p.sex,
    birthDate: p.birth_date,
    heightCm: p.height_cm,
    weightKg: p.weight_kg,
    activityLevel: p.activity_level,
    goal: p.goal,
    bmrKcal: p.bmr_kcal,
    tdeeKcal: p.tdee_kcal,
    targetKcal: p.target_kcal,
    targetProteinG: p.target_protein_g,
    targetCarbsG: p.target_carbs_g,
    targetFatG: p.target_fat_g,
    timezone: p.timezone,
    mealWindows: {
      breakfastEnd: p.breakfast_end_time,
      lunchEnd: p.lunch_end_time,
      dinnerEnd: p.dinner_end_time,
    },
    onboardingCompletedAt: p.onboarding_completed_at,
  };
}

export async function getNutritionProfile(env: Env, userId: number): Promise<NutritionProfileRow | null> {
  return env.DB.prepare("SELECT * FROM user_nutrition_profile WHERE user_id = ?").bind(userId).first<NutritionProfileRow>();
}

export interface UpsertNutritionProfileParams {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  timezone?: string;
}

export async function upsertNutritionProfile(
  env: Env,
  userId: number,
  params: UpsertNutritionProfileParams
): Promise<NutritionProfileRow> {
  const targets = computeNutritionTargets(params);
  const timezone = params.timezone ?? "Europe/Amsterdam";

  await env.DB.prepare(
    `INSERT INTO user_nutrition_profile
       (user_id, sex, birth_date, height_cm, weight_kg, activity_level, goal,
        bmr_kcal, tdee_kcal, target_kcal, target_protein_g, target_carbs_g, target_fat_g,
        timezone, onboarding_completed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     ON CONFLICT (user_id) DO UPDATE SET
       sex = excluded.sex,
       birth_date = excluded.birth_date,
       height_cm = excluded.height_cm,
       weight_kg = excluded.weight_kg,
       activity_level = excluded.activity_level,
       goal = excluded.goal,
       bmr_kcal = excluded.bmr_kcal,
       tdee_kcal = excluded.tdee_kcal,
       target_kcal = excluded.target_kcal,
       target_protein_g = excluded.target_protein_g,
       target_carbs_g = excluded.target_carbs_g,
       target_fat_g = excluded.target_fat_g,
       timezone = excluded.timezone,
       onboarding_completed_at = COALESCE(user_nutrition_profile.onboarding_completed_at, excluded.onboarding_completed_at),
       updated_at = excluded.updated_at`
  )
    .bind(
      userId,
      params.sex,
      params.birthDate,
      params.heightCm,
      params.weightKg,
      params.activityLevel,
      params.goal,
      targets.bmrKcal,
      targets.tdeeKcal,
      targets.targetKcal,
      targets.macros.proteinG,
      targets.macros.carbsG,
      targets.macros.fatG,
      timezone
    )
    .run();

  const profile = await getNutritionProfile(env, userId);
  if (!profile) throw new Error("Failed to load nutrition profile after upsert.");
  return profile;
}

export async function updateMealWindows(
  env: Env,
  userId: number,
  windows: { breakfastEnd: string; lunchEnd: string; dinnerEnd: string }
): Promise<void> {
  await env.DB.prepare(
    `UPDATE user_nutrition_profile
     SET breakfast_end_time = ?, lunch_end_time = ?, dinner_end_time = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE user_id = ?`
  )
    .bind(windows.breakfastEnd, windows.lunchEnd, windows.dinnerEnd, userId)
    .run();
}
