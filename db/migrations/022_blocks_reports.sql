-- App Store guideline 1.2 (user-generated content): users can block other
-- users and report posts, comments, and users for admin review.
CREATE TABLE user_blocks (
  blocker_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);
CREATE INDEX idx_user_blocks_blocked ON user_blocks (blocked_id);

-- target_user_id is always set (the author of the reported content, or the
-- reported user), so an admin can act on the account even after the content
-- itself is removed.
CREATE TABLE reports (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type     TEXT    NOT NULL CHECK (target_type IN ('post','comment','user')),
  target_id       INTEGER NOT NULL,
  target_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason          TEXT    NOT NULL CHECK (reason IN ('spam','harassment','inappropriate','other')),
  details         TEXT,
  status          TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  resolved_at     TEXT
);
CREATE INDEX idx_reports_status_created ON reports (status, created_at DESC);
