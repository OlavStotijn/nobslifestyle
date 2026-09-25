-- In-app notification center, backing both the bell icon (works even
-- without push permission granted) and as the source fetched by the
-- service worker's push handler to build the real notification text.
CREATE TABLE notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL CHECK (type IN ('friend_request','friend_accepted','post_comment','post_like')),
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  link        TEXT,
  read_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
