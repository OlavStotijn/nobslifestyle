-- Progress photos: a user's own private timeline by default, optionally
-- shared to friends. No public/anonymous tier exists anywhere in this app,
-- so "post it" means "visible to friends who view your profile", not the
-- open web.
CREATE TABLE progress_photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  r2_key      TEXT    NOT NULL,
  taken_at    TEXT    NOT NULL,
  weight_kg   REAL,
  notes       TEXT,
  visibility  TEXT    NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','friends')),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_progress_photos_user ON progress_photos (user_id, taken_at DESC);
