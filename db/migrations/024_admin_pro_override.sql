-- Lets an admin manually grant/revoke Pro (comps, support) outside the
-- normal Mollie flow. SQLite can't ALTER a CHECK constraint directly, so
-- admin_audit_log is recreated with the extended action list.
CREATE TABLE admin_audit_log_new (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action           TEXT    NOT NULL CHECK (action IN (
                     'impersonate_start','impersonate_end','suspend_user','reactivate_user',
                     'delete_user','moderation_remove','grant_pro','remove_pro'
                   )),
  target_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  details          TEXT,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO admin_audit_log_new SELECT * FROM admin_audit_log;
DROP TABLE admin_audit_log;
ALTER TABLE admin_audit_log_new RENAME TO admin_audit_log;
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log (created_at DESC);
