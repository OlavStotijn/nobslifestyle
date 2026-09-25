-- Standalone weigh-ins (no photo required), separate from progress_photos'
-- optional weight_kg field — trend charting over time.
CREATE TABLE weight_logs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg          REAL    NOT NULL,
  logged_date_local  TEXT    NOT NULL,
  note               TEXT,
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_weight_logs_user_date ON weight_logs (user_id, logged_date_local DESC);
