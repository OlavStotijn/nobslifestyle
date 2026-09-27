-- Daily checklist items: one-off or recurring (daily / specific weekdays),
-- optionally shared with an accepted friend (both must tick it for a given
-- day before it counts as done), optionally linked to a workout schema or a
-- food item so finishing that workout / logging that food auto-completes it.
CREATE TABLE checklist_items (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                    TEXT    NOT NULL,
  notes                    TEXT,
  start_date               TEXT    NOT NULL,
  recurrence               TEXT    NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly')),
  recurrence_weekdays      TEXT,          -- comma-separated 0-6 (Sun-Sat), only when recurrence='weekly'
  reminder_time            TEXT,          -- "HH:MM" local
  deadline_time            TEXT,          -- "HH:MM" local
  linked_workout_schema_id INTEGER REFERENCES workout_schemas(id) ON DELETE SET NULL,
  linked_food_item_id      INTEGER REFERENCES food_items(id) ON DELETE SET NULL,
  last_reminder_sent_date  TEXT,          -- dedupes the reminder cron within a day
  archived_at              TEXT,
  created_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_checklist_items_owner ON checklist_items (owner_user_id, archived_at);

-- A tagged friend on a collab item — must accept before they (or the item)
-- count as shared.
CREATE TABLE checklist_collaborators (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_item_id  INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status             TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  responded_at       TEXT,
  UNIQUE (checklist_item_id, user_id)
);
CREATE INDEX idx_checklist_collaborators_user ON checklist_collaborators (user_id, status);

-- One row per (item, participant, day) that ticked it — a collab item is
-- "done" for a date once every accepted participant has a row here.
CREATE TABLE checklist_completions (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_item_id     INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_date_local  TEXT    NOT NULL,
  completed_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (checklist_item_id, user_id, completed_date_local)
);
CREATE INDEX idx_checklist_completions_item_date ON checklist_completions (checklist_item_id, completed_date_local);

-- A daily "X/Y done" progress snapshot shared to the feed. Deliberately its
-- own table rather than a new posts column — posts.CHECK enforces exactly
-- one of session_id/cardio_session_id, and SQLite can't widen that CHECK
-- without rebuilding a table post_likes/post_comments already FK into.
CREATE TABLE checklist_snapshots (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date_local TEXT    NOT NULL,
  done_count          INTEGER NOT NULL,
  total_count         INTEGER NOT NULL,
  done_titles         TEXT    NOT NULL,   -- JSON array of strings
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, snapshot_date_local)
);
CREATE INDEX idx_checklist_snapshots_user ON checklist_snapshots (user_id, created_at DESC);
