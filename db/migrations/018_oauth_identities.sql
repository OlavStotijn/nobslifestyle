-- Google/Apple sign-in: links an external provider account to a local user.
-- password_hash on users stays NOT NULL — OAuth-only signups get a random,
-- unusable bcrypt hash instead of a schema change, so the sign-in code path
-- (find user by session -> password_hash present) doesn't need special-casing.
CREATE TABLE oauth_identities (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          TEXT    NOT NULL CHECK (provider IN ('google','apple')),
  provider_user_id  TEXT    NOT NULL,
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_oauth_identities_user ON oauth_identities (user_id);
