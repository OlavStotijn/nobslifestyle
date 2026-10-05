-- Basic/Pro plan via a recurring Mollie subscription. pro_until is the
-- single source of truth for entitlement (isPro = pro_until in the future)
-- rather than a separate plan flag — a cancelled or failed-to-renew
-- subscription just lets this lapse naturally, no cron needed to "downgrade."
ALTER TABLE users ADD COLUMN pro_until TEXT;
ALTER TABLE users ADD COLUMN mollie_customer_id TEXT;
ALTER TABLE users ADD COLUMN mollie_subscription_id TEXT;

-- Single-use token bridging the native app to a logged-in website session
-- for checkout, without the user re-entering credentials in the external
-- browser — same shape as email_verification_tokens, short TTL since it's
-- a live handoff rather than an emailed link.
CREATE TABLE checkout_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT    NOT NULL UNIQUE,
  expires_at  TEXT    NOT NULL,
  used_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_checkout_tokens_user ON checkout_tokens (user_id);
