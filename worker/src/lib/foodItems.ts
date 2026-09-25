import type { Env } from "../types";

export interface FoodItemRow {
  id: number;
  barcode: string | null;
  name: string;
  brand: string | null;
  source: "off" | "manual" | "ocr" | "user";
  serving_size_g: number | null;
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number | null;
  sugar_g_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  image_url: string | null;
}

export function publicFoodItem(f: FoodItemRow) {
  return {
    id: f.id,
    barcode: f.barcode,
    name: f.name,
    brand: f.brand,
    source: f.source,
    servingSizeG: f.serving_size_g,
    caloriesPer100g: f.calories_kcal_per_100g,
    proteinPer100g: f.protein_g_per_100g,
    carbsPer100g: f.carbs_g_per_100g,
    fatPer100g: f.fat_g_per_100g,
    imageUrl: f.image_url,
  };
}

export interface FoodItemInput {
  barcode?: string | null;
  name: string;
  brand?: string | null;
  source: "off" | "manual" | "ocr" | "user";
  servingSizeG?: number | null;
  caloriesPer100g: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number | null;
  sugarPer100g?: number | null;
  sodiumMgPer100g?: number | null;
  imageUrl?: string | null;
  createdByUserId?: number | null;
}

export async function findFoodItemByBarcode(env: Env, barcode: string): Promise<FoodItemRow | null> {
  return env.DB.prepare("SELECT * FROM food_items WHERE barcode = ?").bind(barcode).first<FoodItemRow>();
}

export async function getFoodItemById(env: Env, id: number): Promise<FoodItemRow | null> {
  return env.DB.prepare("SELECT * FROM food_items WHERE id = ?").bind(id).first<FoodItemRow>();
}

// Upsert on barcode when present (cache-through for OFF results); otherwise
// always inserts a new row (manual/OCR entries have no natural dedupe key).
export async function upsertFoodItem(env: Env, input: FoodItemInput): Promise<FoodItemRow> {
  if (input.barcode) {
    const existing = await findFoodItemByBarcode(env, input.barcode);
    if (existing) {
      await env.DB.prepare(
        `UPDATE food_items SET
           name = ?, brand = ?, serving_size_g = ?, calories_kcal_per_100g = ?,
           protein_g_per_100g = ?, carbs_g_per_100g = ?, fat_g_per_100g = ?,
           fiber_g_per_100g = ?, sugar_g_per_100g = ?, sodium_mg_per_100g = ?,
           image_url = ?, off_last_synced_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?`
      )
        .bind(
          input.name,
          input.brand ?? null,
          input.servingSizeG ?? null,
          input.caloriesPer100g,
          input.proteinPer100g ?? 0,
          input.carbsPer100g ?? 0,
          input.fatPer100g ?? 0,
          input.fiberPer100g ?? null,
          input.sugarPer100g ?? null,
          input.sodiumMgPer100g ?? null,
          input.imageUrl ?? null,
          existing.id
        )
        .run();
      return (await getFoodItemById(env, existing.id))!;
    }
  }

  const result = await env.DB.prepare(
    `INSERT INTO food_items
       (barcode, name, brand, source, serving_size_g, calories_kcal_per_100g,
        protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fiber_g_per_100g,
        sugar_g_per_100g, sodium_mg_per_100g, image_url, off_last_synced_at, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      input.barcode ?? null,
      input.name,
      input.brand ?? null,
      input.source,
      input.servingSizeG ?? null,
      input.caloriesPer100g,
      input.proteinPer100g ?? 0,
      input.carbsPer100g ?? 0,
      input.fatPer100g ?? 0,
      input.fiberPer100g ?? null,
      input.sugarPer100g ?? null,
      input.sodiumMgPer100g ?? null,
      input.imageUrl ?? null,
      input.source === "off" ? new Date().toISOString() : null,
      input.createdByUserId ?? null
    )
    .run();

  const id = result.meta.last_row_id as number;
  return (await getFoodItemById(env, id))!;
}

export async function listFavoriteFoodItems(env: Env, userId: number): Promise<FoodItemRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT fi.* FROM food_favorites ff
     JOIN food_items fi ON fi.id = ff.food_item_id
     WHERE ff.user_id = ? ORDER BY ff.created_at DESC`
  )
    .bind(userId)
    .all<FoodItemRow>();
  return results;
}

export async function addFavoriteFoodItem(env: Env, userId: number, foodItemId: number): Promise<void> {
  await env.DB.prepare("INSERT OR IGNORE INTO food_favorites (user_id, food_item_id) VALUES (?, ?)").bind(userId, foodItemId).run();
}

export async function removeFavoriteFoodItem(env: Env, userId: number, foodItemId: number): Promise<void> {
  await env.DB.prepare("DELETE FROM food_favorites WHERE user_id = ? AND food_item_id = ?").bind(userId, foodItemId).run();
}

// Most recently logged distinct food items — a quick-add list separate from
// favorites (which are deliberately starred).
export async function listRecentFoodItems(env: Env, userId: number, limit = 10): Promise<FoodItemRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT fi.*, MAX(fl.logged_at) AS last_logged_at FROM food_logs fl
     JOIN food_items fi ON fi.id = fl.food_item_id
     WHERE fl.user_id = ?
     GROUP BY fl.food_item_id
     ORDER BY last_logged_at DESC
     LIMIT ?`
  )
    .bind(userId, limit)
    .all<FoodItemRow>();
  return results;
}
