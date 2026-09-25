import type { Env } from "../types";
import { findFoodItemByBarcode, upsertFoodItem, type FoodItemRow } from "./foodItems";

// Open Food Facts: free, open product database with barcode lookup and text
// search, calories/macros per 100g for ~3M products. A descriptive
// User-Agent with contact info is required by their usage policy.
const SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS = "code,product_name,brands,quantity,nutriments,image_front_small_url,image_small_url";

interface OffNutriments {
  "energy-kcal_100g"?: number;
  "proteins_100g"?: number;
  "carbohydrates_100g"?: number;
  "fat_100g"?: number;
  "fiber_100g"?: number;
  "sugars_100g"?: number;
  "sodium_100g"?: number; // grams per 100g in OFF's raw nutriments
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  nutriments?: OffNutriments;
  image_front_small_url?: string;
  image_small_url?: string;
}

function parseServingGrams(quantity: string | undefined): number | null {
  if (!quantity) return null;
  const match = quantity.match(/([\d.]+)\s*g/i);
  return match ? Number(match[1]) : null;
}

function hasUsableCalories(p: OffProduct): boolean {
  return typeof p.nutriments?.["energy-kcal_100g"] === "number" && !!p.product_name;
}

async function cacheOffProduct(env: Env, p: OffProduct): Promise<FoodItemRow> {
  const n = p.nutriments ?? {};
  return upsertFoodItem(env, {
    barcode: p.code ?? null,
    name: p.product_name!,
    brand: p.brands?.split(",")[0]?.trim() ?? null,
    source: "off",
    servingSizeG: parseServingGrams(p.quantity),
    caloriesPer100g: n["energy-kcal_100g"]!,
    proteinPer100g: n["proteins_100g"] ?? 0,
    carbsPer100g: n["carbohydrates_100g"] ?? 0,
    fatPer100g: n["fat_100g"] ?? 0,
    fiberPer100g: n["fiber_100g"] ?? null,
    sugarPer100g: n["sugars_100g"] ?? null,
    sodiumMgPer100g: typeof n["sodium_100g"] === "number" ? n["sodium_100g"] * 1000 : null,
    imageUrl: p.image_front_small_url ?? p.image_small_url ?? null,
  });
}

export async function searchOpenFoodFacts(env: Env, query: string, limit = 20): Promise<FoodItemRow[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(limit));
  url.searchParams.set("fields", FIELDS);

  const res = await fetch(url, { headers: { "User-Agent": env.OPEN_FOOD_FACTS_USER_AGENT } });
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`);

  const data = await res.json<{ products?: OffProduct[] }>();
  const usable = (data.products ?? []).filter(hasUsableCalories);
  return Promise.all(usable.map((p) => cacheOffProduct(env, p)));
}

export async function lookupOpenFoodFactsBarcode(env: Env, barcode: string): Promise<FoodItemRow | null> {
  const cached = await findFoodItemByBarcode(env, barcode);
  if (cached) return cached;

  const res = await fetch(`${PRODUCT_URL}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
    headers: { "User-Agent": env.OPEN_FOOD_FACTS_USER_AGENT },
  });
  if (!res.ok) throw new Error(`Open Food Facts lookup failed (${res.status})`);

  const data = await res.json<{ status: number; product?: OffProduct }>();
  if (data.status !== 1 || !data.product || !hasUsableCalories(data.product)) return null;

  return cacheOffProduct(env, { ...data.product, code: data.product.code ?? barcode });
}
