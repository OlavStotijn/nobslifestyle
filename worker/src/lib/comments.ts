import type { Env } from "../types";

export interface CommentRow {
  id: number;
  post_id: number;
  user_id: number;
  body: string;
  created_at: string;
  display_name: string;
  username: string | null;
  avatar_r2_key: string | null;
}

export function publicComment(row: CommentRow) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    user: {
      id: row.user_id,
      displayName: row.display_name,
      username: row.username,
      avatarUrl: row.avatar_r2_key ? `/api/media/${row.avatar_r2_key}` : null,
    },
  };
}

export async function listComments(env: Env, postId: number): Promise<CommentRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT pc.*, u.display_name, u.username, u.avatar_r2_key
     FROM post_comments pc
     JOIN users u ON u.id = pc.user_id
     WHERE pc.post_id = ? ORDER BY pc.created_at ASC`
  )
    .bind(postId)
    .all<CommentRow>();
  return results;
}

// Returns the comment plus the post's author id, so the caller can decide
// whether to notify (skip if you commented on your own post).
export async function addComment(
  env: Env,
  userId: number,
  postId: number,
  body: string
): Promise<{ comment: CommentRow; postAuthorId: number } | null> {
  const post = await env.DB.prepare("SELECT user_id FROM posts WHERE id = ?").bind(postId).first<{ user_id: number }>();
  if (!post) return null;

  const result = await env.DB.prepare("INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)")
    .bind(postId, userId, body)
    .run();
  const id = result.meta.last_row_id as number;

  const row = await env.DB.prepare(
    `SELECT pc.*, u.display_name, u.username, u.avatar_r2_key
     FROM post_comments pc JOIN users u ON u.id = pc.user_id WHERE pc.id = ?`
  )
    .bind(id)
    .first<CommentRow>();
  if (!row) throw new Error("Failed to load newly created comment.");

  return { comment: row, postAuthorId: post.user_id };
}

export async function deleteComment(env: Env, userId: number, commentId: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM post_comments WHERE id = ? AND user_id = ?").bind(commentId, userId).run();
  return (result.meta.changes ?? 0) > 0;
}
