-- Cardio (running/cycling) sessions: GPS-tracked, separate from the
-- schema-driven strength training_sessions since there's no schema/sets
-- concept here — just a continuous route + distance/duration/calories.
CREATE TABLE cardio_sessions (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type         TEXT    NOT NULL CHECK (activity_type IN ('running','cycling')),
  started_at            TEXT    NOT NULL,
  finished_at           TEXT,
  started_date_local    TEXT    NOT NULL,
  distance_m            REAL    NOT NULL DEFAULT 0,
  duration_s            INTEGER NOT NULL DEFAULT 0,
  calories_kcal         INTEGER NOT NULL DEFAULT 0,
  route_geojson         TEXT,
  subtract_from_intake  INTEGER NOT NULL DEFAULT 1,
  rating                INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes                 TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_cardio_sessions_user_date ON cardio_sessions (user_id, started_date_local);

-- Rebuild `posts` to allow posting either a strength session OR a cardio
-- session (never both) — SQLite can't relax an existing NOT NULL/add a
-- cross-column CHECK via plain ALTER TABLE, so this is a full table rebuild.
CREATE TABLE posts_new (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id         INTEGER REFERENCES training_sessions(id) ON DELETE CASCADE,
  cardio_session_id  INTEGER REFERENCES cardio_sessions(id) ON DELETE CASCADE,
  caption            TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (session_id),
  UNIQUE (cardio_session_id),
  CHECK ((session_id IS NULL) != (cardio_session_id IS NULL))
);
INSERT INTO posts_new (id, user_id, session_id, caption, created_at)
  SELECT id, user_id, session_id, caption, created_at FROM posts;
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;
CREATE INDEX idx_posts_user_created ON posts (user_id, created_at DESC);
