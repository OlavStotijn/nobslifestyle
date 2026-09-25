import type { Env } from "../types";
import { getFoodItemById } from "./foodItems";
import { determineMealType, localDateInTz, localTimeInTz, type MealType } from "./time";
import { getNutritionProfile } from "./nutritionProfile";

export interface FoodLogRow {
  id: number;
  user_id: number;
  food_item_id: number;
  quantity_g: number;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  meal_type_auto: number;
  logged_at: string;
  logged_date_local: string;
  source: "search" | "barcode" | "photo_ocr" | "manual" | "quick_repeat";
}

export interface FoodLogWithItem extends FoodLogRow {
  food_item_name: string;
  food_item_brand: string | null;
  food_item_image_url: string | null;
}

export function publicFoodLog(row: FoodLogWithItem) {
  return {
    id: row.id,
    foodItemId: row.food_item_id,
    foodItemName: row.food_item_name,
    foodItemBrand: row.food_item_brand,
    foodItemImageUrl: row.food_item_image_url,
    quantityG: row.quantity_g,
    calories: row.calories_kcal,
    protein: row.protein_g,
    carbs: row.carbs_g,
    fat: row.fat_g,
    mealType: row.meal_type,
    mealTypeAuto: row.meal_type_auto === 1,
    loggedAt: row.logged_at,
    source: row.source,
  };
}

async function resolveMealContext(env: Env, userId: number, loggedAt: Date) {
  const profile = await getNutritionProfile(env, userId);
  const timezone = profile?.timezone ?? "Europe/Amsterdam";
  const windows = profile
    ? { breakfastEnd: profile.breakfast_end_time, lunchEnd: profile.lunch_end_time, dinnerEnd: profile.dinner_end_time }
    : { breakfastEnd: "11:00", lunchEnd: "16:00", dinnerEnd: "21:00" };

  const localDate = localDateInTz(loggedAt, timezone);
  const localTime = localTimeInTz(loggedAt, timezone);
  const mealType = determineMealType(localTime, windows);
  return { localDate, mealType };
}

function scale(perHundred: number, quantityG: number): number {
  return Math.round((perHundred * quantityG) / 100);
}

export interface CreateFoodLogParams {
  foodItemId: number;
  quantityG: number;
  mealTypeOverride?: MealType;
  source: FoodLogRow["source"];
  loggedAt?: Date;
}

export async function createFoodLog(env: Env, userId: number, params: CreateFoodLogParams): Promise<FoodLogWithItem> {
  const item = await getFoodItemById(env, params.foodItemId);
  if (!item) throw new Error("Food item not found.");

  const loggedAt = params.loggedAt ?? new Date();
  const { localDate, mealType: autoMealType } = await resolveMealContext(env, userId, loggedAt);
  const mealType = params.mealTypeOverride ?? autoMealType;

  const calories = scale(item.calories_kcal_per_100g, params.quantityG);
  const protein = scale(item.protein_g_per_100g, params.quantityG);
  const carbs = scale(item.carbs_g_per_100g, params.quantityG);
  const fat = scale(item.fat_g_per_100g, params.quantityG);

  const result = await env.DB.prepare(
    `INSERT INTO food_logs
       (user_id, food_item_id, quantity_g, calories_kcal, protein_g, carbs_g, fat_g,
        meal_type, meal_type_auto, logged_at, logged_date_local, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      userId,
      item.id,
      params.quantityG,
      calories,
      protein,
      carbs,
      fat,
      mealType,
      params.mealTypeOverride ? 0 : 1,
      loggedAt.toISOString(),
      localDate,
      params.source
    )
    .run();

  const id = result.meta.last_row_id as number;
  const row = await getFoodLogById(env, userId, id);
  if (!row) throw new Error("Failed to load newly created food log.");
  return row;
}

const SELECT_WITH_ITEM = `
  SELECT fl.*, fi.name AS food_item_name, fi.brand AS food_item_brand, fi.image_url AS food_item_image_url
  FROM food_logs fl
  JOIN food_items fi ON fi.id = fl.food_item_id
`;

export async function getFoodLogById(env: Env, userId: number, id: number): Promise<FoodLogWithItem | null> {
  return env.DB.prepare(`${SELECT_WITH_ITEM} WHERE fl.id = ? AND fl.user_id = ?`)
    .bind(id, userId)
    .first<FoodLogWithItem>();
}

export async function listFoodLogsForDate(env: Env, userId: number, dateLocal: string): Promise<FoodLogWithItem[]> {
  const { results } = await env.DB.prepare(
    `${SELECT_WITH_ITEM} WHERE fl.user_id = ? AND fl.logged_date_local = ? ORDER BY fl.logged_at ASC`
  )
    .bind(userId, dateLocal)
    .all<FoodLogWithItem>();
  return results;
}

export interface DailySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function getDailySummary(env: Env, userId: number, dateLocal: string): Promise<DailySummary> {
  const row = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(calories_kcal), 0) AS calories,
       COALESCE(SUM(protein_g), 0) AS protein,
       COALESCE(SUM(carbs_g), 0) AS carbs,
       COALESCE(SUM(fat_g), 0) AS fat
     FROM food_logs WHERE user_id = ? AND logged_date_local = ?`
  )
    .bind(userId, dateLocal)
    .first<DailySummary>();
  return row ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export interface UpdateFoodLogParams {
  quantityG?: number;
  mealType?: MealType;
}

export async function updateFoodLog(
  env: Env,
  userId: number,
  id: number,
  params: UpdateFoodLogParams
): Promise<FoodLogWithItem | null> {
  const existing = await getFoodLogById(env, userId, id);
  if (!existing) return null;

  const item = await getFoodItemById(env, existing.food_item_id);
  if (!item) return null;

  const quantityG = params.quantityG ?? existing.quantity_g;
  const mealType = params.mealType ?? existing.meal_type;
  const mealTypeAuto = params.mealType ? 0 : existing.meal_type_auto;

  await env.DB.prepare(
    `UPDATE food_logs SET
       quantity_g = ?, calories_kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ?,
       meal_type = ?, meal_type_auto = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ? AND user_id = ?`
  )
    .bind(
      quantityG,
      scale(item.calories_kcal_per_100g, quantityG),
      scale(item.protein_g_per_100g, quantityG),
      scale(item.carbs_g_per_100g, quantityG),
      scale(item.fat_g_per_100g, quantityG),
      mealType,
      mealTypeAuto,
      id,
      userId
    )
    .run();

  return getFoodLogById(env, userId, id);
}

export async function deleteFoodLog(env: Env, userId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM food_logs WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return (result.meta.changes ?? 0) > 0;
}
