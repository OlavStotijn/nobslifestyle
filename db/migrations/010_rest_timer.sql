-- Default rest-between-sets duration, editable in Settings, used to drive
-- the in-session rest countdown after logging a set.
ALTER TABLE users ADD COLUMN rest_timer_seconds INTEGER NOT NULL DEFAULT 90;
