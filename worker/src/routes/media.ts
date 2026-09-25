import { Hono } from "hono";
import type { Env } from "../types";

export const mediaRoute = new Hono<{ Bindings: Env }>();

// Serves R2 objects referenced by food_items.image_url / users.avatar_r2_key
// (e.g. "/api/media/ocr/12/1234.jpg" -> key "ocr/12/1234.jpg"). Content is
// user-uploaded food photos and avatars, not sensitive, so this is public.
mediaRoute.get("/api/media/*", async (c) => {
  const key = c.req.path.replace(/^\/api\/media\//, "");
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.json({ error: "Not found." }, 404);

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
