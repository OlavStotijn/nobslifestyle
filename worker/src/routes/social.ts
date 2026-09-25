import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { createPost, deletePost, getFeed, likePost, publicFeedPost, unlikePost } from "../lib/social";
import { isImageAppropriate } from "../lib/contentModeration";

export const socialRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

socialRoute.use("/api/feed", requireAuth);
socialRoute.use("/api/posts*", requireAuth);

socialRoute.get("/api/feed", async (c) => {
  const { posts, likedPostIds } = await getFeed(c.env, c.get("userId"));
  return c.json({ posts: posts.map((p) => publicFeedPost(p, likedPostIds.has(p.post_id))) });
});

const MAX_POST_PHOTO_BYTES = 10 * 1024 * 1024;

// Always multipart: a post can optionally carry a photo (shown as slide one
// of a two-slide card, with the workout/run stats as slide two), so the
// same endpoint accepts the file alongside the usual fields.
socialRoute.post("/api/posts", async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) return c.json({ error: "Invalid form data." }, 422);

  const sessionIdRaw = form.get("sessionId");
  const cardioSessionIdRaw = form.get("cardioSessionId");
  const sessionId = typeof sessionIdRaw === "string" && sessionIdRaw ? Number(sessionIdRaw) : undefined;
  const cardioSessionId = typeof cardioSessionIdRaw === "string" && cardioSessionIdRaw ? Number(cardioSessionIdRaw) : undefined;
  if (!sessionId && !cardioSessionId) {
    return c.json({ error: "sessionId or cardioSessionId is required." }, 422);
  }

  const captionRaw = form.get("caption");
  const locationRaw = form.get("location");
  const caption = typeof captionRaw === "string" && captionRaw.trim() ? captionRaw.trim() : undefined;
  const location = typeof locationRaw === "string" && locationRaw.trim() ? locationRaw.trim() : undefined;

  let photoR2Key: string | undefined;
  const file = form.get("image");
  if (file instanceof File) {
    if (file.size > MAX_POST_PHOTO_BYTES) return c.json({ error: "Image is too large (max 10MB)." }, 422);
    const buffer = await file.arrayBuffer();

    const appropriate = await isImageAppropriate(c.env, buffer, file.type);
    if (!appropriate) {
      return c.json({ error: "This photo looks like it may violate our content guidelines. Try a different one." }, 422);
    }

    const userId = c.get("userId");
    photoR2Key = `posts/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
    await c.env.MEDIA.put(photoR2Key, buffer, { httpMetadata: { contentType: file.type || "image/jpeg" } });
  }

  const postId = await createPost(c.env, c.get("userId"), { sessionId, cardioSessionId, caption, location, photoR2Key });
  if (!postId) return c.json({ error: "Session not found or not finished yet." }, 422);
  return c.json({ postId }, 201);
});

socialRoute.delete("/api/posts/:id", async (c) => {
  const ok = await deletePost(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

socialRoute.post("/api/posts/:id/like", async (c) => {
  await likePost(c.env, c.get("userId"), Number(c.req.param("id")));
  return c.json({ ok: true });
});

socialRoute.delete("/api/posts/:id/like", async (c) => {
  await unlikePost(c.env, c.get("userId"), Number(c.req.param("id")));
  return c.json({ ok: true });
});
