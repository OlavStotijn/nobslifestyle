import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { getUserById, isValidLandingPage, publicUser } from "../lib/users";
import {
  getNutritionProfile,
  publicNutritionProfile,
  updateMealWindows,
  upsertNutritionProfile,
} from "../lib/nutritionProfile";
import type { ActivityLevel, Goal, Sex } from "../lib/nutrition";

export const profileRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

profileRoute.use("/api/profile/*", requireAuth);
profileRoute.use("/api/nutrition-profile/*", requireAuth);
profileRoute.use("/api/nutrition-profile", requireAuth);

profileRoute.get("/api/profile", async (c) => {
  const user = await getUserById(c.env, c.get("userId"));
  if (!user) return c.json({ error: "Not found." }, 404);
  return c.json({ user: publicUser(user) });
});

interface UpdateProfileBody {
  displayName?: string;
  username?: string;
  weightUnit?: "kg" | "lb";
  distanceUnit?: "km" | "mi";
  defaultLandingPage?: string;
}

const VALID_WEIGHT_UNITS = ["kg", "lb"];
const VALID_DISTANCE_UNITS = ["km", "mi"];

profileRoute.patch("/api/profile", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<UpdateProfileBody>().catch(() => null);
  if (!body) return c.json({ error: "Invalid body." }, 422);

  if (body.username) {
    const taken = await c.env.DB.prepare("SELECT id FROM users WHERE username = ? AND id != ?")
      .bind(body.username, userId)
      .first();
    if (taken) return c.json({ error: "That username is already taken." }, 422);
  }

  if (body.defaultLandingPage !== undefined && !isValidLandingPage(body.defaultLandingPage)) {
    return c.json({ error: "Invalid defaultLandingPage." }, 422);
  }
  if (body.weightUnit !== undefined && !VALID_WEIGHT_UNITS.includes(body.weightUnit)) {
    return c.json({ error: "Invalid weightUnit." }, 422);
  }
  if (body.distanceUnit !== undefined && !VALID_DISTANCE_UNITS.includes(body.distanceUnit)) {
    return c.json({ error: "Invalid distanceUnit." }, 422);
  }

  await c.env.DB.prepare(
    `UPDATE users SET
       display_name = COALESCE(?, display_name),
       username = COALESCE(?, username),
       weight_unit = COALESCE(?, weight_unit),
       distance_unit = COALESCE(?, distance_unit),
       default_landing_page = COALESCE(?, default_landing_page),
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  )
    .bind(
      body.displayName ?? null,
      body.username ?? null,
      body.weightUnit ?? null,
      body.distanceUnit ?? null,
      body.defaultLandingPage ?? null,
      userId
    )
    .run();

  const user = await getUserById(c.env, userId);
  if (!user) return c.json({ error: "Not found." }, 404);
  return c.json({ user: publicUser(user) });
});

profileRoute.get("/api/nutrition-profile", async (c) => {
  const profile = await getNutritionProfile(c.env, c.get("userId"));
  if (!profile) return c.json({ profile: null });
  return c.json({ profile: publicNutritionProfile(profile) });
});

interface PutNutritionProfileBody {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  timezone?: string;
}

const VALID_SEX: Sex[] = ["male", "female"];
const VALID_ACTIVITY: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const VALID_GOAL: Goal[] = ["lose", "maintain", "gain"];

profileRoute.put("/api/nutrition-profile", async (c) => {
  const body = await c.req.json<Partial<PutNutritionProfileBody>>().catch(() => null);

  if (
    !body?.sex ||
    !VALID_SEX.includes(body.sex) ||
    !body.birthDate ||
    !body.heightCm ||
    !body.weightKg ||
    !body.activityLevel ||
    !VALID_ACTIVITY.includes(body.activityLevel) ||
    !body.goal ||
    !VALID_GOAL.includes(body.goal)
  ) {
    return c.json({ error: "sex, birthDate, heightCm, weightKg, activityLevel, and goal are all required." }, 422);
  }

  const profile = await upsertNutritionProfile(c.env, c.get("userId"), {
    sex: body.sex,
    birthDate: body.birthDate,
    heightCm: body.heightCm,
    weightKg: body.weightKg,
    activityLevel: body.activityLevel,
    goal: body.goal,
    timezone: body.timezone,
  });

  return c.json({ profile: publicNutritionProfile(profile) });
});

interface MealWindowsBody {
  breakfastEnd: string;
  lunchEnd: string;
  dinnerEnd: string;
}

profileRoute.patch("/api/nutrition-profile/meal-windows", async (c) => {
  const body = await c.req.json<Partial<MealWindowsBody>>().catch(() => null);
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (
    !body?.breakfastEnd ||
    !body.lunchEnd ||
    !body.dinnerEnd ||
    ![body.breakfastEnd, body.lunchEnd, body.dinnerEnd].every((t) => timePattern.test(t))
  ) {
    return c.json({ error: "breakfastEnd, lunchEnd, and dinnerEnd are required as HH:MM." }, 422);
  }

  await updateMealWindows(c.env, c.get("userId"), body as MealWindowsBody);
  const profile = await getNutritionProfile(c.env, c.get("userId"));
  return c.json({ profile: profile ? publicNutritionProfile(profile) : null });
});
