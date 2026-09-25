export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_KCAL_DELTA: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 350,
};

function ageFromBirthDate(birthDate: string): number {
  const dob = new Date(birthDate);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

// Mifflin-St Jeor.
export function calculateBmr(sex: Sex, heightCm: number, weightKg: number, birthDate: string): number {
  const age = ageFromBirthDate(birthDate);
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// Protein ~1.8g/kg bodyweight, fat ~25% of kcal, carbs = remainder.
export function calculateMacros(targetKcal: number, weightKg: number): MacroTargets {
  const proteinG = Math.round(weightKg * 1.8);
  const proteinKcal = proteinG * 4;
  const fatKcal = targetKcal * 0.25;
  const fatG = Math.round(fatKcal / 9);
  const carbsKcal = Math.max(0, targetKcal - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);
  return { proteinG, carbsG, fatG };
}

export interface NutritionTargets {
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  macros: MacroTargets;
}

export function computeNutritionTargets(params: {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}): NutritionTargets {
  const bmrKcal = calculateBmr(params.sex, params.heightCm, params.weightKg, params.birthDate);
  const tdeeKcal = calculateTdee(bmrKcal, params.activityLevel);
  const targetKcal = Math.max(1200, tdeeKcal + GOAL_KCAL_DELTA[params.goal]);
  const macros = calculateMacros(targetKcal, params.weightKg);
  return { bmrKcal: Math.round(bmrKcal), tdeeKcal: Math.round(tdeeKcal), targetKcal: Math.round(targetKcal), macros };
}
