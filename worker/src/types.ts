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
}
