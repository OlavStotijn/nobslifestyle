-- Widen notifications.type to add checklist_invite/checklist_accepted.
-- SQLite can't ALTER a CHECK constraint in place, so this is the standard
-- rebuild: nothing FKs into notifications.id, so it's a safe rename/copy.
ALTER TABLE notifications RENAME TO notifications_old;

CREATE TABLE notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL CHECK (type IN (
                'friend_request','friend_accepted','post_comment','post_like',
                'checklist_invite','checklist_accepted','checklist_reminder'
              )),
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  link        TEXT,
  read_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT INTO notifications (id, user_id, type, title, body, link, read_at, created_at)
  SELECT id, user_id, type, title, body, link, read_at, created_at FROM notifications_old;

DROP TABLE notifications_old;

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
