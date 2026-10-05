import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { requirePro } from "../middleware/requirePro";
import { createBodyMeasurement, deleteBodyMeasurement, listBodyMeasurements, publicBodyMeasurement } from "../lib/bodyMeasurements";

export const bodyMeasurementsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

bodyMeasurementsRoute.use("/api/measurements*", requireAuth, requirePro);

bodyMeasurementsRoute.get("/api/measurements", async (c) => {
  const measurements = await listBodyMeasurements(c.env, c.get("userId"));
  return c.json({ measurements: measurements.map(publicBodyMeasurement) });
});

interface CreateBodyMeasurementBody {
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  armsCm?: number;
  thighsCm?: number;
  note?: string;
}

bodyMeasurementsRoute.post("/api/measurements", async (c) => {
  const body = await c.req.json<Partial<CreateBodyMeasurementBody>>().catch(() => null);
  if (!body || [body.waistCm, body.chestCm, body.hipsCm, body.armsCm, body.thighsCm].every((v) => v == null)) {
    return c.json({ error: "At least one measurement is required." }, 422);
  }

  const measurement = await createBodyMeasurement(c.env, c.get("userId"), body);
  return c.json({ measurement: publicBodyMeasurement(measurement) }, 201);
});

bodyMeasurementsRoute.delete("/api/measurements/:id", async (c) => {
  const ok = await deleteBodyMeasurement(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});
