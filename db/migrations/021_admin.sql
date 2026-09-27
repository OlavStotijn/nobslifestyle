-- Admin panel: account suspension, a coarse last-active timestamp for usage
-- stats, and an audit trail for admin actions (impersonation especially).
ALTER TABLE users ADD COLUMN suspended_at TEXT;
ALTER TABLE users ADD COLUMN last_seen_at TEXT;

CREATE TABLE admin_audit_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action           TEXT    NOT NULL CHECK (action IN (
                     'impersonate_start','impersonate_end','suspend_user','reactivate_user',
                     'delete_user','moderation_remove'
                   )),
  target_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  details          TEXT,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log (created_at DESC);
