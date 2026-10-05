-- Pro feature: tracking body measurements beyond weight. One row per log
-- entry, mirroring weight_logs' shape — every measurement column is
-- nullable since a user might only log one or two at a time.
CREATE TABLE body_measurements (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date_local  TEXT    NOT NULL,
  waist_cm           REAL,
  chest_cm           REAL,
  hips_cm            REAL,
  arms_cm            REAL,
  thighs_cm          REAL,
  note               TEXT,
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_body_measurements_user_date ON body_measurements (user_id, logged_date_local DESC);
