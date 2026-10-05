import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { searchOpenFoodFacts, lookupOpenFoodFactsBarcode } from "../lib/openFoodFacts";
import {
  publicFoodItem,
  upsertFoodItem,
  getFoodItemById,
  listFavoriteFoodItems,
  addFavoriteFoodItem,
  removeFavoriteFoodItem,
  listRecentFoodItems,
} from "../lib/foodItems";
import {
  createFoodLog,
  deleteFoodLog,
  getDailySummary,
  getNutritionTrend,
  getWeekSummary,
  listFoodLogsForDate,
  publicFoodLog,
  updateFoodLog,
} from "../lib/foodLogs";
import { getNutritionProfile } from "../lib/nutritionProfile";
import { localDateInTz, startOfWeekInTz, type MealType } from "../lib/time";
import { autoCompleteLinkedChecklistItems } from "../lib/checklist";
import { extractNutritionFromLabel } from "../lib/ocr";
import { scanMealPhoto } from "../lib/mealScan";
import { generateFoodPlan } from "../lib/foodPlanGen";
import { generateRecipe } from "../lib/recipeGen";
import { isImageAppropriate } from "../lib/contentModeration";
import { requirePro } from "../middleware/requirePro";
import { maxTrendWeeks } from "../lib/proStatus";
import { tooManyAttempts, hit } from "../lib/rateLimit";
import { getBurnedKcalForDate } from "../lib/cardioSessions";
import {
  createSavedMeal,
  deleteSavedMeal,
  getSavedMealOwned,
  listSavedMealItems,
  listSavedMeals,
  logSavedMeal,
  publicSavedMeal,
} from "../lib/savedMeals";

export const foodRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

foodRoute.use("/api/food/*", requireAuth);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function todayFallback(dateParam: string | undefined): string {
  if (dateParam && DATE_PATTERN.test(dateParam)) return dateParam;
  return new Date().toISOString().slice(0, 10);
}

foodRoute.get("/api/food/search", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q) return c.json({ items: [] });

  try {
    const items = await searchOpenFoodFacts(c.env, q);
    return c.json({ items: items.map(publicFoodItem) });
  } catch (err) {
    console.error("Open Food Facts search failed", err);
    return c.json({ error: "Search is temporarily unavailable." }, 502);
  }
});

foodRoute.get("/api/food/barcode/:code", async (c) => {
  const code = c.req.param("code");
  try {
    const item = await lookupOpenFoodFactsBarcode(c.env, code);
    if (!item) return c.json({ error: "No product found for this barcode." }, 404);
    return c.json({ item: publicFoodItem(item) });
  } catch (err) {
    console.error("Open Food Facts barcode lookup failed", err);
    return c.json({ error: "Lookup is temporarily unavailable." }, 502);
  }
});

const MAX_OCR_IMAGE_BYTES = 8 * 1024 * 1024;

// Multipart upload of a nutrition-label photo: run it through the Workers AI
// vision model for extraction, and separately stash the photo in R2 so the
// frontend can attach its key to the food_item it creates after the user
// reviews/edits the extracted numbers (the OCR result itself isn't saved
// anywhere until that confirm step — this endpoint is read-only on the DB).
foodRoute.post("/api/food/ocr", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return c.json({ error: "An image file is required." }, 422);
  if (file.size > MAX_OCR_IMAGE_BYTES) return c.json({ error: "Image is too large (max 8MB)." }, 422);

  const buffer = await file.arrayBuffer();

  let result;
  try {
    result = await extractNutritionFromLabel(c.env, buffer, file.type);
  } catch (err) {
    console.error("OCR extraction failed", err);
    return c.json({ error: "Couldn't read that label. Try a clearer photo or enter it manually." }, 422);
  }

  const key = `ocr/${c.get("userId")}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  await c.env.MEDIA.put(key, buffer, { httpMetadata: { contentType: file.type || "image/jpeg" } });

  return c.json({ result, imageR2Key: key });
});

const MAX_MEAL_SCAN_IMAGE_BYTES = 8 * 1024 * 1024;
const MEAL_SCAN_DAILY_LIMIT = 10;

// Pro-only: identifies multiple food items in a single plate photo (vs. the
// one-item-at-a-time nutrition-label OCR above). Read-only on the DB, same
// as /api/food/ocr — the frontend review step persists items itself after
// the user edits them.
foodRoute.post("/api/food/scan-meal", requirePro, async (c) => {
  const userId = c.get("userId");
  if (await tooManyAttempts(c.env, "ai-meal-scan", String(userId), MEAL_SCAN_DAILY_LIMIT)) {
    return c.json({ error: "You've reached today's limit for meal scans. Try again tomorrow." }, 429);
  }

  const form = await c.req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return c.json({ error: "An image file is required." }, 422);
  if (file.size > MAX_MEAL_SCAN_IMAGE_BYTES) return c.json({ error: "Image is too large (max 8MB)." }, 422);

  const buffer = await file.arrayBuffer();

  let items;
  try {
    items = await scanMealPhoto(c.env, buffer, file.type);
  } catch (err) {
    console.error("Meal scan failed", err);
    return c.json({ error: "Couldn't read that photo. Try a clearer shot or add items manually." }, 422);
  }
  await hit(c.env, "ai-meal-scan", String(userId), 24 * 60 * 60 * 1000);

  return c.json({ items });
});

interface GenerateFoodPlanBody {
  dietaryPreference?: string;
}

const AI_GENERATE_DAILY_LIMIT = 10;

// Pro-only. Suggestions only — nothing is persisted here, same "AI
// suggests, user confirms via the existing create-item/create-log
// endpoints" shape as the OCR and meal-scan features above.
foodRoute.post("/api/food/generate-plan", requirePro, async (c) => {
  const userId = c.get("userId");
  if (await tooManyAttempts(c.env, "ai-generate", String(userId), AI_GENERATE_DAILY_LIMIT)) {
    return c.json({ error: "You've reached today's limit for AI generations. Try again tomorrow." }, 429);
  }

  const body = await c.req.json<Partial<GenerateFoodPlanBody>>().catch(() => null);

  try {
    const meals = await generateFoodPlan(c.env, userId, body?.dietaryPreference?.trim().slice(0, 100) || undefined);
    await hit(c.env, "ai-generate", String(userId), 24 * 60 * 60 * 1000);
    return c.json({ meals });
  } catch (err) {
    console.error("Food plan generation failed", err);
    return c.json({ error: "Couldn't generate a plan. Please try again." }, 502);
  }
});

interface GenerateRecipeBody {
  preference?: string;
  haveIngredients?: string;
  maxMinutes?: number;
}

// Pro-only. Pure display — logging it is a single "add as one meal" action
// using the AI's totals, not decomposed per-ingredient (keeps this simple;
// it's a dinner suggestion, not a structured recipe-builder).
foodRoute.post("/api/food/generate-recipe", requirePro, async (c) => {
  const userId = c.get("userId");
  if (await tooManyAttempts(c.env, "ai-generate", String(userId), AI_GENERATE_DAILY_LIMIT)) {
    return c.json({ error: "You've reached today's limit for AI generations. Try again tomorrow." }, 429);
  }

  const body = await c.req.json<Partial<GenerateRecipeBody>>().catch(() => null);

  try {
    const recipe = await generateRecipe(c.env, {
      preference: body?.preference?.trim().slice(0, 150),
      haveIngredients: body?.haveIngredients?.trim().slice(0, 300),
      maxMinutes: Number.isInteger(body?.maxMinutes) ? (body!.maxMinutes as number) : undefined,
    });
    await hit(c.env, "ai-generate", String(userId), 24 * 60 * 60 * 1000);
    return c.json({ recipe });
  } catch (err) {
    console.error("Recipe generation failed", err);
    return c.json({ error: "Couldn't generate a recipe. Please try again." }, 502);
  }
});

const MAX_FOOD_IMAGE_BYTES = 8 * 1024 * 1024;

// Plain "upload a photo, get back an R2 key" endpoint — separate from
// /api/food/ocr (which also runs AI extraction) so a custom food item's
// product photo doesn't have to pretend to be a nutrition label.
foodRoute.post("/api/food/image", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return c.json({ error: "An image file is required." }, 422);
  if (file.size > MAX_FOOD_IMAGE_BYTES) return c.json({ error: "Image is too large (max 8MB)." }, 422);

  const buffer = await file.arrayBuffer();
  const appropriate = await isImageAppropriate(c.env, buffer, file.type);
  if (!appropriate) {
    return c.json({ error: "This photo looks like it may violate our content guidelines. Try a different one." }, 422);
  }

  const key = `food/${c.get("userId")}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  await c.env.MEDIA.put(key, buffer, { httpMetadata: { contentType: file.type || "image/jpeg" } });

  return c.json({ imageR2Key: key });
});

interface CreateFoodItemBody {
  name: string;
  brand?: string;
  servingSizeG?: number;
  caloriesPer100g: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumMgPer100g?: number;
  source?: "manual" | "ocr" | "user";
  imageR2Key?: string;
}

foodRoute.post("/api/food/items", async (c) => {
  const body = await c.req.json<Partial<CreateFoodItemBody>>().catch(() => null);
  if (!body?.name || typeof body.caloriesPer100g !== "number") {
    return c.json({ error: "name and caloriesPer100g are required." }, 422);
  }

  const source = body.source === "ocr" ? "ocr" : body.source === "user" ? "user" : "manual";

  const item = await upsertFoodItem(c.env, {
    name: body.name,
    brand: body.brand ?? null,
    source,
    servingSizeG: body.servingSizeG ?? null,
    caloriesPer100g: body.caloriesPer100g,
    proteinPer100g: body.proteinPer100g ?? 0,
    carbsPer100g: body.carbsPer100g ?? 0,
    fatPer100g: body.fatPer100g ?? 0,
    fiberPer100g: body.fiberPer100g ?? null,
    sugarPer100g: body.sugarPer100g ?? null,
    sodiumMgPer100g: body.sodiumMgPer100g ?? null,
    imageUrl: body.imageR2Key ? `/api/media/${body.imageR2Key}` : null,
    createdByUserId: c.get("userId"),
  });

  return c.json({ item: publicFoodItem(item) }, 201);
});

foodRoute.get("/api/food/logs", async (c) => {
  const date = todayFallback(c.req.query("date"));
  const logs = await listFoodLogsForDate(c.env, c.get("userId"), date);
  return c.json({ date, logs: logs.map(publicFoodLog) });
});

foodRoute.get("/api/food/logs/summary", async (c) => {
  const date = todayFallback(c.req.query("date"));
  const userId = c.get("userId");
  const [summary, burnedKcal] = await Promise.all([getDailySummary(c.env, userId, date), getBurnedKcalForDate(c.env, userId, date)]);
  return c.json({ date, summary: { ...summary, burnedKcal } });
});

foodRoute.get("/api/food/logs/week", async (c) => {
  const userId = c.get("userId");
  const weekStartParam = c.req.query("weekStart");

  let weekStart: string;
  if (weekStartParam && DATE_PATTERN.test(weekStartParam)) {
    weekStart = weekStartParam;
  } else {
    const profile = await getNutritionProfile(c.env, userId);
    weekStart = startOfWeekInTz(new Date(), profile?.timezone ?? "Europe/Amsterdam");
  }

  const days = await getWeekSummary(c.env, userId, weekStart);
  return c.json({
    weekStart,
    days: days.map((d) => ({
      date: d.date,
      calories: d.calories,
      protein: d.protein,
      carbs: d.carbs,
      fat: d.fat,
      logs: d.logs.map(publicFoodLog),
    })),
  });
});

foodRoute.get("/api/food/reports/nutrition", async (c) => {
  const userId = c.get("userId");
  const weeks = Math.min(await maxTrendWeeks(c.env, userId, 8), Math.max(1, Number(c.req.query("weeks")) || 8));
  const profile = await getNutritionProfile(c.env, userId);
  const currentWeekStart = startOfWeekInTz(new Date(), profile?.timezone ?? "Europe/Amsterdam");
  const trend = await getNutritionTrend(c.env, userId, currentWeekStart, weeks);
  return c.json({ trend });
});

interface CreateFoodLogBody {
  foodItemId: number;
  quantityG: number;
  mealType?: MealType;
  source: "search" | "barcode" | "photo_ocr" | "manual" | "quick_repeat";
}

foodRoute.post("/api/food/logs", async (c) => {
  const body = await c.req.json<Partial<CreateFoodLogBody>>().catch(() => null);
  if (!body?.foodItemId || !body.quantityG || body.quantityG <= 0 || !body.source) {
    return c.json({ error: "foodItemId, a positive quantityG, and source are required." }, 422);
  }
  if (body.mealType && !VALID_MEAL_TYPES.includes(body.mealType)) {
    return c.json({ error: "Invalid mealType." }, 422);
  }

  const item = await getFoodItemById(c.env, body.foodItemId);
  if (!item) return c.json({ error: "Food item not found." }, 404);

  const userId = c.get("userId");
  const log = await createFoodLog(c.env, userId, {
    foodItemId: body.foodItemId,
    quantityG: body.quantityG,
    mealTypeOverride: body.mealType,
    source: body.source,
  });

  c.executionCtx.waitUntil(
    (async () => {
      const profile = await getNutritionProfile(c.env, userId);
      const dateLocal = localDateInTz(new Date(), profile?.timezone ?? "Europe/Amsterdam");
      await autoCompleteLinkedChecklistItems(c.env, userId, { foodItemId: body.foodItemId, dateLocal });
    })()
  );

  return c.json({ log: publicFoodLog(log) }, 201);
});

interface UpdateFoodLogBody {
  quantityG?: number;
  mealType?: MealType;
}

foodRoute.patch("/api/food/logs/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<UpdateFoodLogBody>().catch(() => null);
  if (!body || (!body.quantityG && !body.mealType)) {
    return c.json({ error: "Nothing to update." }, 422);
  }
  if (body.mealType && !VALID_MEAL_TYPES.includes(body.mealType)) {
    return c.json({ error: "Invalid mealType." }, 422);
  }

  const log = await updateFoodLog(c.env, c.get("userId"), id, body);
  if (!log) return c.json({ error: "Not found." }, 404);
  return c.json({ log: publicFoodLog(log) });
});

foodRoute.delete("/api/food/logs/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const deleted = await deleteFoodLog(c.env, c.get("userId"), id);
  if (!deleted) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

foodRoute.get("/api/food/favorites", async (c) => {
  const items = await listFavoriteFoodItems(c.env, c.get("userId"));
  return c.json({ items: items.map(publicFoodItem) });
});

foodRoute.post("/api/food/favorites/:foodItemId", async (c) => {
  await addFavoriteFoodItem(c.env, c.get("userId"), Number(c.req.param("foodItemId")));
  return c.json({ ok: true });
});

foodRoute.delete("/api/food/favorites/:foodItemId", async (c) => {
  await removeFavoriteFoodItem(c.env, c.get("userId"), Number(c.req.param("foodItemId")));
  return c.json({ ok: true });
});

foodRoute.get("/api/food/recent", async (c) => {
  const items = await listRecentFoodItems(c.env, c.get("userId"));
  return c.json({ items: items.map(publicFoodItem) });
});

async function savedMealWithItems(env: Env, userId: number, id: number) {
  const meal = await getSavedMealOwned(env, userId, id);
  if (!meal) return null;
  return publicSavedMeal(meal, await listSavedMealItems(env, id));
}

foodRoute.get("/api/food/saved-meals", async (c) => {
  const meals = await listSavedMeals(c.env, c.get("userId"));
  const withItems = await Promise.all(meals.map((m) => savedMealWithItems(c.env, c.get("userId"), m.id)));
  return c.json({ meals: withItems });
});

interface CreateSavedMealBody {
  name: string;
  items: { foodItemId: number; quantityG: number }[];
}

foodRoute.post("/api/food/saved-meals", async (c) => {
  const body = await c.req.json<Partial<CreateSavedMealBody>>().catch(() => null);
  if (!body?.name || !Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: "name and at least one item are required." }, 422);
  }
  const meal = await createSavedMeal(c.env, c.get("userId"), { name: body.name, items: body.items });
  return c.json({ meal: await savedMealWithItems(c.env, c.get("userId"), meal.id) }, 201);
});

foodRoute.delete("/api/food/saved-meals/:id", async (c) => {
  const ok = await deleteSavedMeal(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

foodRoute.post("/api/food/saved-meals/:id/log", async (c) => {
  const mealId = Number(c.req.param("id"));
  const meal = await getSavedMealOwned(c.env, c.get("userId"), mealId);
  if (!meal) return c.json({ error: "Not found." }, 404);
  const logs = await logSavedMeal(c.env, c.get("userId"), mealId);
  return c.json({ logs: logs.map(publicFoodLog) }, 201);
});
