import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { searchOpenFoodFacts, lookupOpenFoodFactsBarcode } from "../lib/openFoodFacts";
import { publicFoodItem, upsertFoodItem, getFoodItemById } from "../lib/foodItems";
import {
  createFoodLog,
  deleteFoodLog,
  getDailySummary,
  listFoodLogsForDate,
  publicFoodLog,
  updateFoodLog,
} from "../lib/foodLogs";
import type { MealType } from "../lib/time";
import { extractNutritionFromLabel } from "../lib/ocr";

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

interface CreateFoodItemBody {
  name: string;
  brand?: string;
  servingSizeG?: number;
  caloriesPer100g: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  source?: "manual" | "ocr";
  imageR2Key?: string;
}

foodRoute.post("/api/food/items", async (c) => {
  const body = await c.req.json<Partial<CreateFoodItemBody>>().catch(() => null);
  if (!body?.name || typeof body.caloriesPer100g !== "number") {
    return c.json({ error: "name and caloriesPer100g are required." }, 422);
  }

  const item = await upsertFoodItem(c.env, {
    name: body.name,
    brand: body.brand ?? null,
    source: body.source === "ocr" ? "ocr" : "manual",
    servingSizeG: body.servingSizeG ?? null,
    caloriesPer100g: body.caloriesPer100g,
    proteinPer100g: body.proteinPer100g ?? 0,
    carbsPer100g: body.carbsPer100g ?? 0,
    fatPer100g: body.fatPer100g ?? 0,
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
  const summary = await getDailySummary(c.env, c.get("userId"), date);
  return c.json({ date, summary });
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

  const log = await createFoodLog(c.env, c.get("userId"), {
    foodItemId: body.foodItemId,
    quantityG: body.quantityG,
    mealTypeOverride: body.mealType,
    source: body.source,
  });

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
