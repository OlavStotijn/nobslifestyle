import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { requirePro } from "../middleware/requirePro";
import { listWeightLogs } from "../lib/weightLogs";
import { getVolumeTrend } from "../lib/progress";
import { getCardioTrend } from "../lib/cardioSessions";
import { getNutritionTrend } from "../lib/foodLogs";
import { getNutritionProfile } from "../lib/nutritionProfile";
import { startOfWeekInTz } from "../lib/time";
import { buildSummaryPdf, type PdfReportSection } from "../lib/pdfReport";

export const exportRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

exportRoute.use("/api/export/*", requireAuth);

function csvEscape(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((col) => csvEscape(row[col])).join(","));
  return lines.join("\n");
}

function csvResponse(c: any, filename: string, csv: string) {
  return c.body(csv, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
}

exportRoute.get("/api/export/sessions.csv", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ts.started_at, ts.finished_at, ts.schema_name_snapshot, ts.rating, e.name AS exercise_name,
            ss.set_number, ss.reps, ss.weight_kg
     FROM training_sessions ts
     JOIN session_exercises se ON se.session_id = ts.id
     JOIN exercises e ON e.id = se.exercise_id
     JOIN session_sets ss ON ss.session_exercise_id = se.id
     WHERE ts.user_id = ? AND ts.finished_at IS NOT NULL
     ORDER BY ts.started_at ASC, se.sort_order ASC, ss.set_number ASC`
  )
    .bind(c.get("userId"))
    .all();

  const csv = toCsv(results, [
    "started_at",
    "finished_at",
    "schema_name_snapshot",
    "rating",
    "exercise_name",
    "set_number",
    "reps",
    "weight_kg",
  ]);
  return csvResponse(c, "nobslifestyle-workouts.csv", csv);
});

exportRoute.get("/api/export/food-logs.csv", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT fl.logged_at, fl.logged_date_local, fl.meal_type, fi.name AS food_item_name,
            fl.quantity_g, fl.calories_kcal, fl.protein_g, fl.carbs_g, fl.fat_g
     FROM food_logs fl
     JOIN food_items fi ON fi.id = fl.food_item_id
     WHERE fl.user_id = ?
     ORDER BY fl.logged_at ASC`
  )
    .bind(c.get("userId"))
    .all();

  const csv = toCsv(results, [
    "logged_at",
    "logged_date_local",
    "meal_type",
    "food_item_name",
    "quantity_g",
    "calories_kcal",
    "protein_g",
    "carbs_g",
    "fat_g",
  ]);
  return csvResponse(c, "nobslifestyle-food-log.csv", csv);
});

// Pro-only. A printable text summary, not a pixel copy of the in-app
// charts — see pdfReport.ts for why.
exportRoute.get("/api/export/report.pdf", requirePro, async (c) => {
  const userId = c.get("userId");
  const profile = await getNutritionProfile(c.env, userId);
  const timezone = profile?.timezone ?? "Europe/Amsterdam";
  const currentWeekStart = startOfWeekInTz(new Date(), timezone);

  const [weightLogs, volumeTrend, cardioTrend, nutritionTrend] = await Promise.all([
    listWeightLogs(c.env, userId, 52),
    getVolumeTrend(c.env, userId, timezone, 26),
    getCardioTrend(c.env, userId, timezone, 26),
    getNutritionTrend(c.env, userId, currentWeekStart, 26),
  ]);

  const sections: PdfReportSection[] = [
    {
      title: "Weight",
      rows: weightLogs.slice(-20).map((w) => [w.logged_date_local, `${w.weight_kg.toFixed(1)} kg`]),
    },
    {
      title: "Training volume (per week)",
      rows: volumeTrend.filter((w) => w.volumeKg > 0).map((w) => [w.weekStart, `${Math.round(w.volumeKg)} kg total`]),
    },
    {
      title: "Cardio (per week)",
      rows: cardioTrend
        .filter((w) => w.running.distanceM > 0 || w.cycling.distanceM > 0)
        .map((w) => [
          w.weekStart,
          `Running ${(w.running.distanceM / 1000).toFixed(1)}km`,
          `Cycling ${(w.cycling.distanceM / 1000).toFixed(1)}km`,
        ]),
    },
    {
      title: "Nutrition (avg/day per week)",
      rows: nutritionTrend
        .filter((w) => w.avgCalories > 0)
        .map((w) => [
          w.weekStart,
          `${Math.round(w.avgCalories)} kcal`,
          `P${Math.round(w.avgProtein)}g`,
          `C${Math.round(w.avgCarbs)}g`,
          `F${Math.round(w.avgFat)}g`,
        ]),
    },
  ];

  const pdf = await buildSummaryPdf("NoBSLifestyle — Progress Report", new Date().toLocaleDateString(), sections);
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="nobslifestyle-report.pdf"',
    },
  });
});
