export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  RATE_LIMIT_KV: KVNamespace;
  AI: Ai;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  APP_URL: string;
  MAIL_FROM_ADDRESS: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  OPEN_FOOD_FACTS_USER_AGENT: string;
  SESSION_SECRET: string;
  SEND_EMAIL: SendEmail;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY_JWK: string;
  // Google/Apple sign-in — these are OAuth client identifiers, not secrets
  // (they're the public "aud" a client puts in its ID token request), so
  // they live in wrangler.jsonc `vars` like TURNSTILE_SITE_KEY does.
  GOOGLE_CLIENT_ID_WEB: string;
  GOOGLE_CLIENT_ID_IOS: string;
  GOOGLE_CLIENT_ID_ANDROID: string;
  APPLE_SERVICES_ID: string;
  APPLE_BUNDLE_ID: string;
}
