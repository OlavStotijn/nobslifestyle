import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { areFriends } from "../lib/friendships";
import {
  createProgressPhoto,
  deleteProgressPhoto,
  listFriendVisibleProgressPhotos,
  listOwnProgressPhotos,
  publicProgressPhoto,
  updateProgressPhoto,
  type PhotoVisibility,
} from "../lib/progressPhotos";

export const progressPhotosRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

progressPhotosRoute.use("/api/progress-photos*", requireAuth);

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const VALID_VISIBILITY: PhotoVisibility[] = ["private", "friends"];

progressPhotosRoute.get("/api/progress-photos", async (c) => {
  const photos = await listOwnProgressPhotos(c.env, c.get("userId"));
  return c.json({ photos: photos.map(publicProgressPhoto) });
});

progressPhotosRoute.post("/api/progress-photos", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return c.json({ error: "An image file is required." }, 422);
  if (file.size > MAX_PHOTO_BYTES) return c.json({ error: "Image is too large (max 10MB)." }, 422);

  const weightRaw = form?.get("weightKg");
  const notesRaw = form?.get("notes");
  const visibilityRaw = form?.get("visibility");
  const visibility = VALID_VISIBILITY.includes(visibilityRaw as PhotoVisibility) ? (visibilityRaw as PhotoVisibility) : "private";
  const weightKg = typeof weightRaw === "string" && weightRaw.trim() !== "" ? Number(weightRaw) : null;

  const userId = c.get("userId");
  const key = `progress/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  await c.env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "image/jpeg" } });

  const photo = await createProgressPhoto(c.env, userId, {
    r2Key: key,
    weightKg: weightKg != null && Number.isFinite(weightKg) ? weightKg : null,
    notes: typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null,
    visibility,
  });

  return c.json({ photo: publicProgressPhoto(photo) }, 201);
});

interface UpdatePhotoBody {
  weightKg?: number | null;
  notes?: string | null;
  visibility?: PhotoVisibility;
}

progressPhotosRoute.patch("/api/progress-photos/:id", async (c) => {
  const body = await c.req.json<UpdatePhotoBody>().catch(() => null);
  if (body?.visibility && !VALID_VISIBILITY.includes(body.visibility)) {
    return c.json({ error: "Invalid visibility." }, 422);
  }

  const photo = await updateProgressPhoto(c.env, c.get("userId"), Number(c.req.param("id")), body ?? {});
  if (!photo) return c.json({ error: "Not found." }, 404);
  return c.json({ photo: publicProgressPhoto(photo) });
});

progressPhotosRoute.delete("/api/progress-photos/:id", async (c) => {
  const deleted = await deleteProgressPhoto(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!deleted) return c.json({ error: "Not found." }, 404);
  await c.env.MEDIA.delete(deleted.r2_key);
  return c.json({ ok: true });
});

// Friends-visibility only — private photos never leave the owner's own list above.
progressPhotosRoute.get("/api/progress-photos/friend/:friendUserId", async (c) => {
  const friendUserId = Number(c.req.param("friendUserId"));
  const friends = await areFriends(c.env, c.get("userId"), friendUserId);
  if (!friends) return c.json({ error: "Not friends with this user." }, 403);

  const photos = await listFriendVisibleProgressPhotos(c.env, friendUserId);
  return c.json({ photos: photos.map(publicProgressPhoto) });
});
