-- User-configurable "which tab opens on app load" preference (Settings page).
-- Valid values ('summary'|'food'|'workouts'|'feed'|'profile') are enforced in
-- the route handler rather than a CHECK constraint here — SQLite's ALTER
-- TABLE ADD COLUMN support for CHECK constraints is inconsistent across
-- versions, and this migration must run cleanly against an already-deployed table.
ALTER TABLE users ADD COLUMN default_landing_page TEXT NOT NULL DEFAULT 'summary';
