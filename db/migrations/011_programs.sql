-- A program assigns a schema (or rest day, schema_id NULL) to each weekday,
-- so the app can surface "today's workout" without the user picking a
-- schema manually every time.
CREATE TABLE workout_programs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_programs_user ON workout_programs (user_id);

CREATE TABLE program_days (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id  INTEGER NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  weekday     INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = Sunday
  schema_id   INTEGER REFERENCES workout_schemas(id) ON DELETE SET NULL,
  UNIQUE (program_id, weekday)
);

-- Nullable: a user may have zero or one active program at a time. No FK
-- clause (SQLite ALTER TABLE ADD COLUMN restrictions, same as migration
-- 006) — ownership is validated in the route handler instead.
ALTER TABLE users ADD COLUMN active_program_id INTEGER;
