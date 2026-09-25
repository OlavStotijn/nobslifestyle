import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { createPost, deletePost, getFeed, likePost, publicFeedPost, unlikePost } from "../lib/social";

export const socialRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

socialRoute.use("/api/feed", requireAuth);
socialRoute.use("/api/posts*", requireAuth);

socialRoute.get("/api/feed", async (c) => {
  const { posts, likedPostIds } = await getFeed(c.env, c.get("userId"));
  return c.json({ posts: posts.map((p) => publicFeedPost(p, likedPostIds.has(p.post_id))) });
});

interface CreatePostBody {
  sessionId: number;
  caption?: string;
}

socialRoute.post("/api/posts", async (c) => {
  const body = await c.req.json<Partial<CreatePostBody>>().catch(() => null);
  if (!body?.sessionId) return c.json({ error: "sessionId is required." }, 422);

  const postId = await createPost(c.env, c.get("userId"), body.sessionId, body.caption);
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
