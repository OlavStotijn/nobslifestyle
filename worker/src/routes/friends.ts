import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import {
  listFriends,
  listIncomingRequests,
  removeFriend,
  respondToFriendRequest,
  searchUsersByUsername,
  sendFriendRequest,
} from "../lib/friendships";

export const friendsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

friendsRoute.use("/api/friends*", requireAuth);
friendsRoute.use("/api/users/search", requireAuth);

friendsRoute.get("/api/friends", async (c) => {
  const friends = await listFriends(c.env, c.get("userId"));
  return c.json({ friends });
});

friendsRoute.get("/api/friends/requests", async (c) => {
  const requests = await listIncomingRequests(c.env, c.get("userId"));
  return c.json({ requests });
});

interface SendRequestBody {
  toUsername: string;
}

const REQUEST_RESULT_ERRORS: Record<string, string> = {
  self: "You can't friend yourself.",
  not_found: "No user found with that username.",
  already_friends: "You're already friends.",
  already_pending: "You've already sent a request to this person.",
};

friendsRoute.post("/api/friends/requests", async (c) => {
  const body = await c.req.json<Partial<SendRequestBody>>().catch(() => null);
  if (!body?.toUsername) return c.json({ error: "toUsername is required." }, 422);

  const result = await sendFriendRequest(c.env, c.get("userId"), body.toUsername);
  if (result in REQUEST_RESULT_ERRORS) return c.json({ error: REQUEST_RESULT_ERRORS[result] }, 422);
  return c.json({ result }, 201);
});

friendsRoute.post("/api/friends/requests/:id/accept", async (c) => {
  const ok = await respondToFriendRequest(c.env, c.get("userId"), Number(c.req.param("id")), true);
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

friendsRoute.post("/api/friends/requests/:id/decline", async (c) => {
  const ok = await respondToFriendRequest(c.env, c.get("userId"), Number(c.req.param("id")), false);
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

friendsRoute.delete("/api/friends/:id", async (c) => {
  const ok = await removeFriend(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

friendsRoute.get("/api/users/search", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q) return c.json({ users: [] });
  const users = await searchUsersByUsername(c.env, q, c.get("userId"));
  return c.json({ users });
});
