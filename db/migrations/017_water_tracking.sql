-- Water intake tracking: per-log entries plus one settings row per user
-- (goal + reminder window). Reminders are evaluated client-side against
-- this settings row — there's no server-side cron/push for them yet.

CREATE TABLE water_logs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ml          INTEGER NOT NULL,
  logged_at          TEXT    NOT NULL,
  logged_date_local  TEXT    NOT NULL,
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_water_logs_user_date ON water_logs (user_id, logged_date_local);

CREATE TABLE water_settings (
  user_id                     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  goal_ml                     INTEGER NOT NULL DEFAULT 2000,
  reminders_enabled           INTEGER NOT NULL DEFAULT 0,
  reminder_interval_minutes   INTEGER NOT NULL DEFAULT 60,
  reminder_start_time         TEXT    NOT NULL DEFAULT '08:00',
  reminder_end_time           TEXT    NOT NULL DEFAULT '22:00',
  updated_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
