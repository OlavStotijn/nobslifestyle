import type { Env } from "../types";

export type LandingPage = "checklist" | "food" | "workouts" | "reports" | "feed" | "profile";
const VALID_LANDING_PAGES: LandingPage[] = ["checklist", "food", "workouts", "reports", "feed", "profile"];

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  username: string | null;
  avatar_r2_key: string | null;
  weight_unit: "kg" | "lb";
  distance_unit: "km" | "mi";
  default_landing_page: string;
  rest_timer_seconds: number;
  active_program_id: number | null;
  token_version: number;
  email_verified_at: string | null;
  suspended_at: string | null;
  last_seen_at: string | null;
  pro_until: string | null;
  mollie_customer_id: string | null;
  mollie_subscription_id: string | null;
  created_at: string;
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    username: u.username,
    avatarUrl: u.avatar_r2_key ? `/api/media/${u.avatar_r2_key}` : null,
    weightUnit: u.weight_unit,
    distanceUnit: u.distance_unit,
    defaultLandingPage: (VALID_LANDING_PAGES.includes(u.default_landing_page as LandingPage)
      ? u.default_landing_page
      : "checklist") as LandingPage,
    restTimerSeconds: u.rest_timer_seconds,
    activeProgramId: u.active_program_id,
    emailVerified: u.email_verified_at !== null,
    // Derived from pro_until, not a separate stored flag — a cancelled or
    // failed-to-renew subscription just lets this lapse on its own.
    isPro: u.pro_until !== null && u.pro_until > new Date().toISOString(),
    proUntil: u.pro_until,
  };
}

export function isValidLandingPage(value: unknown): value is LandingPage {
  return typeof value === "string" && VALID_LANDING_PAGES.includes(value as LandingPage);
}

export async function findUserByEmail(env: Env, email: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase()).first<UserRow>();
}

export async function findUserByUsername(env: Env, username: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first<UserRow>();
}

export async function getUserById(env: Env, id: number): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

export async function createUser(
  env: Env,
  params: { email: string; passwordHash: string; displayName: string; username: string | null }
): Promise<UserRow> {
  const result = await env.DB.prepare(
    "INSERT INTO users (email, password_hash, display_name, username) VALUES (?, ?, ?, ?)"
  )
    .bind(params.email.toLowerCase(), params.passwordHash, params.displayName, params.username)
    .run();

  const id = result.meta.last_row_id as number;
  const user = await getUserById(env, id);
  if (!user) throw new Error("Failed to load newly created user.");
  return user;
}

export async function setPasswordAndBumpTokenVersion(env: Env, userId: number, passwordHash: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  )
    .bind(passwordHash, userId)
    .run();
}

export async function markEmailVerified(env: Env, userId: number): Promise<void> {
  await env.DB.prepare(
    "UPDATE users SET email_verified_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  )
    .bind(userId)
    .run();
}
