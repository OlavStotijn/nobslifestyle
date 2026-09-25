import type { Env } from "../types";
import { createFoodLog, type FoodLogWithItem } from "./foodLogs";

export interface SavedMealRow {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

export interface SavedMealItemRow {
  id: number;
  saved_meal_id: number;
  food_item_id: number;
  quantity_g: number;
  food_item_name: string;
}

export function publicSavedMeal(row: SavedMealRow, items: SavedMealItemRow[]) {
  return {
    id: row.id,
    name: row.name,
    items: items.map((i) => ({ id: i.id, foodItemId: i.food_item_id, foodItemName: i.food_item_name, quantityG: i.quantity_g })),
  };
}

export async function listSavedMeals(env: Env, userId: number): Promise<SavedMealRow[]> {
  const { results } = await env.DB.prepare("SELECT * FROM saved_meals WHERE user_id = ? ORDER BY created_at DESC")
    .bind(userId)
    .all<SavedMealRow>();
  return results;
}

export async function getSavedMealOwned(env: Env, userId: number, id: number): Promise<SavedMealRow | null> {
  return env.DB.prepare("SELECT * FROM saved_meals WHERE id = ? AND user_id = ?").bind(id, userId).first<SavedMealRow>();
}

export async function listSavedMealItems(env: Env, savedMealId: number): Promise<SavedMealItemRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT smi.*, fi.name AS food_item_name FROM saved_meal_items smi
     JOIN food_items fi ON fi.id = smi.food_item_id
     WHERE smi.saved_meal_id = ?`
  )
    .bind(savedMealId)
    .all<SavedMealItemRow>();
  return results;
}

export async function createSavedMeal(
  env: Env,
  userId: number,
  params: { name: string; items: { foodItemId: number; quantityG: number }[] }
): Promise<SavedMealRow> {
  const result = await env.DB.prepare("INSERT INTO saved_meals (user_id, name) VALUES (?, ?)").bind(userId, params.name).run();
  const id = result.meta.last_row_id as number;

  if (params.items.length > 0) {
    const statements = params.items.map((item) =>
      env.DB.prepare("INSERT INTO saved_meal_items (saved_meal_id, food_item_id, quantity_g) VALUES (?, ?, ?)").bind(
        id,
        item.foodItemId,
        item.quantityG
      )
    );
    await env.DB.batch(statements);
  }

  const row = await getSavedMealOwned(env, userId, id);
  if (!row) throw new Error("Failed to load newly created saved meal.");
  return row;
}

export async function deleteSavedMeal(env: Env, userId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM saved_meals WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return (result.meta.changes ?? 0) > 0;
}

// Logs every item in the saved meal as its own food_log row (auto meal-type
// bucketing still applies, same as any other log).
export async function logSavedMeal(env: Env, userId: number, savedMealId: number): Promise<FoodLogWithItem[]> {
  const items = await listSavedMealItems(env, savedMealId);
  const logs: FoodLogWithItem[] = [];
  for (const item of items) {
    logs.push(await createFoodLog(env, userId, { foodItemId: item.food_item_id, quantityG: item.quantity_g, source: "quick_repeat" }));
  }
  return logs;
}
