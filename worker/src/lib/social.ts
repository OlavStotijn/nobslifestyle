import type { Env } from "../types";
import { getFriendUserIds } from "./friendships";

export interface FeedPostRow {
  post_id: number;
  caption: string | null;
  post_created_at: string;
  user_id: number;
  display_name: string;
  username: string | null;
  avatar_r2_key: string | null;
  // strength session fields (null for a cardio post)
  session_id: number | null;
  schema_name_snapshot: string | null;
  started_at: string | null;
  rating: number | null;
  notes: string | null;
  progress_summary: string | null;
  // cardio session fields (null for a strength post)
  cardio_session_id: number | null;
  cardio_activity_type: string | null;
  cardio_started_at: string | null;
  cardio_distance_m: number | null;
  cardio_duration_s: number | null;
  cardio_calories_kcal: number | null;
  cardio_rating: number | null;
  cardio_notes: string | null;
  like_count: number;
}

export function publicFeedPost(row: FeedPostRow, likedByMe: boolean) {
  const base = {
    postId: row.post_id,
    caption: row.caption,
    createdAt: row.post_created_at,
    user: {
      id: row.user_id,
      displayName: row.display_name,
      username: row.username,
      avatarUrl: row.avatar_r2_key ? `/api/media/${row.avatar_r2_key}` : null,
    },
    likeCount: row.like_count,
    likedByMe,
  };

  if (row.cardio_session_id != null) {
    return {
      ...base,
      type: "cardio" as const,
      cardio: {
        id: row.cardio_session_id,
        activityType: row.cardio_activity_type,
        startedAt: row.cardio_started_at,
        distanceM: row.cardio_distance_m,
        durationS: row.cardio_duration_s,
        calories: row.cardio_calories_kcal,
        rating: row.cardio_rating,
        notes: row.cardio_notes,
      },
    };
  }

  return {
    ...base,
    type: "strength" as const,
    session: {
      id: row.session_id,
      schemaName: row.schema_name_snapshot,
      startedAt: row.started_at,
      rating: row.rating,
      notes: row.notes,
      progressSummary: row.progress_summary ? JSON.parse(row.progress_summary) : null,
    },
  };
}

const FEED_SELECT = `
  SELECT
    p.id AS post_id, p.caption, p.created_at AS post_created_at,
    u.id AS user_id, u.display_name, u.username, u.avatar_r2_key,
    ts.id AS session_id, ts.schema_name_snapshot, ts.started_at, ts.rating, ts.notes, ts.progress_summary,
    cs.id AS cardio_session_id, cs.activity_type AS cardio_activity_type, cs.started_at AS cardio_started_at,
    cs.distance_m AS cardio_distance_m, cs.duration_s AS cardio_duration_s, cs.calories_kcal AS cardio_calories_kcal,
    cs.rating AS cardio_rating, cs.notes AS cardio_notes,
    (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN training_sessions ts ON ts.id = p.session_id
  LEFT JOIN cardio_sessions cs ON cs.id = p.cardio_session_id
`;

export async function getFeed(env: Env, userId: number, limit = 30): Promise<{ posts: FeedPostRow[]; likedPostIds: Set<number> }> {
  const friendIds = await getFriendUserIds(env, userId);
  const authorIds = [userId, ...friendIds];
  const placeholders = authorIds.map(() => "?").join(",");

  const { results } = await env.DB.prepare(
    `${FEED_SELECT} WHERE p.user_id IN (${placeholders}) ORDER BY p.created_at DESC LIMIT ?`
  )
    .bind(...authorIds, limit)
    .all<FeedPostRow>();

  if (results.length === 0) return { posts: [], likedPostIds: new Set() };

  const postIds = results.map((r) => r.post_id);
  const likedRows = await env.DB.prepare(
    `SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (${postIds.map(() => "?").join(",")})`
  )
    .bind(userId, ...postIds)
    .all<{ post_id: number }>();

  return { posts: results, likedPostIds: new Set(likedRows.results.map((r) => r.post_id)) };
}

export async function createPost(
  env: Env,
  userId: number,
  params: { sessionId?: number; cardioSessionId?: number; caption?: string }
): Promise<number | null> {
  if (params.sessionId) {
    const session = await env.DB.prepare(
      "SELECT id FROM training_sessions WHERE id = ? AND user_id = ? AND finished_at IS NOT NULL"
    )
      .bind(params.sessionId, userId)
      .first();
    if (!session) return null;

    const existing = await env.DB.prepare("SELECT id FROM posts WHERE session_id = ?").bind(params.sessionId).first<{ id: number }>();
    if (existing) return existing.id;

    const result = await env.DB.prepare("INSERT INTO posts (user_id, session_id, caption) VALUES (?, ?, ?)")
      .bind(userId, params.sessionId, params.caption ?? null)
      .run();
    return result.meta.last_row_id as number;
  }

  if (params.cardioSessionId) {
    const session = await env.DB.prepare(
      "SELECT id FROM cardio_sessions WHERE id = ? AND user_id = ? AND finished_at IS NOT NULL"
    )
      .bind(params.cardioSessionId, userId)
      .first();
    if (!session) return null;

    const existing = await env.DB.prepare("SELECT id FROM posts WHERE cardio_session_id = ?")
      .bind(params.cardioSessionId)
      .first<{ id: number }>();
    if (existing) return existing.id;

    const result = await env.DB.prepare("INSERT INTO posts (user_id, cardio_session_id, caption) VALUES (?, ?, ?)")
      .bind(userId, params.cardioSessionId, params.caption ?? null)
      .run();
    return result.meta.last_row_id as number;
  }

  return null;
}

export async function deletePost(env: Env, userId: number, postId: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM posts WHERE id = ? AND user_id = ?").bind(postId, userId).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function likePost(env: Env, userId: number, postId: number): Promise<void> {
  await env.DB.prepare("INSERT OR IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)").bind(postId, userId).run();
}

export async function unlikePost(env: Env, userId: number, postId: number): Promise<void> {
  await env.DB.prepare("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?").bind(postId, userId).run();
}
