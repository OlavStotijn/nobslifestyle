import type { Env } from "../types";

export interface FriendRow {
  friendship_id: number;
  id: number;
  display_name: string;
  username: string | null;
  avatar_r2_key: string | null;
}

export interface FriendRequestRow {
  friendship_id: number;
  requester_id: number;
  id: number;
  display_name: string;
  username: string | null;
  avatar_r2_key: string | null;
  created_at: string;
}

function publicFriendUser(u: { id: number; display_name: string; username: string | null; avatar_r2_key: string | null }) {
  return {
    id: u.id,
    displayName: u.display_name,
    username: u.username,
    avatarUrl: u.avatar_r2_key ? `/api/media/${u.avatar_r2_key}` : null,
  };
}

export async function listFriends(env: Env, userId: number) {
  const { results } = await env.DB.prepare(
    `SELECT f.id AS friendship_id, u.id, u.display_name, u.username, u.avatar_r2_key
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
     WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.addressee_id = ?)
     ORDER BY u.display_name COLLATE NOCASE ASC`
  )
    .bind(userId, userId, userId)
    .all<FriendRow>();
  return results.map((r) => ({ friendshipId: r.friendship_id, user: publicFriendUser(r) }));
}

export async function listIncomingRequests(env: Env, userId: number) {
  const { results } = await env.DB.prepare(
    `SELECT f.id AS friendship_id, f.requester_id, u.id, f.created_at, u.display_name, u.username, u.avatar_r2_key
     FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = ? AND f.status = 'pending'
     ORDER BY f.created_at DESC`
  )
    .bind(userId)
    .all<FriendRequestRow>();
  return results.map((r) => ({ friendshipId: r.friendship_id, createdAt: r.created_at, user: publicFriendUser(r) }));
}

export async function areFriends(env: Env, userA: number, userB: number): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT 1 FROM friendships
     WHERE status = 'accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`
  )
    .bind(userA, userB, userB, userA)
    .first();
  return row != null;
}

export async function getFriendUserIds(env: Env, userId: number): Promise<number[]> {
  const { results } = await env.DB.prepare(
    `SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS friend_id
     FROM friendships WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`
  )
    .bind(userId, userId, userId)
    .all<{ friend_id: number }>();
  return results.map((r) => r.friend_id);
}

export type SendRequestResult = "requested" | "auto_accepted" | "already_friends" | "already_pending" | "self" | "not_found";

// If the target already sent *us* a pending request, accept it instead of
// creating a duplicate reverse row — friendships are symmetric, so two
// one-directional pending rows between the same pair would be redundant.
export async function sendFriendRequest(env: Env, requesterId: number, toUsername: string): Promise<SendRequestResult> {
  const target = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(toUsername).first<{ id: number }>();
  if (!target) return "not_found";
  if (target.id === requesterId) return "self";

  const existing = await env.DB.prepare(
    `SELECT id, requester_id, status FROM friendships
     WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
  )
    .bind(requesterId, target.id, target.id, requesterId)
    .first<{ id: number; requester_id: number; status: string }>();

  if (existing) {
    if (existing.status === "accepted") return "already_friends";
    if (existing.status === "pending" && existing.requester_id === requesterId) return "already_pending";
    if (existing.status === "pending" && existing.requester_id === target.id) {
      await env.DB.prepare("UPDATE friendships SET status = 'accepted', responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
        .bind(existing.id)
        .run();
      return "auto_accepted";
    }
    // previously declined/blocked — let a fresh request reset it
    await env.DB.prepare("UPDATE friendships SET requester_id = ?, addressee_id = ?, status = 'pending', responded_at = NULL WHERE id = ?")
      .bind(requesterId, target.id, existing.id)
      .run();
    return "requested";
  }

  await env.DB.prepare("INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)").bind(requesterId, target.id).run();
  return "requested";
}

export async function respondToFriendRequest(env: Env, userId: number, friendshipId: number, accept: boolean): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE friendships SET status = ?, responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND addressee_id = ? AND status = 'pending'"
  )
    .bind(accept ? "accepted" : "declined", friendshipId, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function removeFriend(env: Env, userId: number, friendshipId: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM friendships WHERE id = ? AND status = 'accepted' AND (requester_id = ? OR addressee_id = ?)"
  )
    .bind(friendshipId, userId, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function searchUsersByUsername(env: Env, query: string, excludingUserId: number) {
  const { results } = await env.DB.prepare(
    "SELECT id, display_name, username, avatar_r2_key FROM users WHERE username LIKE ? COLLATE NOCASE AND id != ? LIMIT 20"
  )
    .bind(`%${query}%`, excludingUserId)
    .all<{ id: number; display_name: string; username: string | null; avatar_r2_key: string | null }>();
  return results.map(publicFriendUser);
}
