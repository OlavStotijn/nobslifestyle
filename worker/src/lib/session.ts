import type { Env } from "../types";

// Stateless HMAC-signed cookie, same approach as this user's other Worker
// projects (rvzn-audio-new's customerSession.ts). Carries userId + a
// tokenVersion so "log out everywhere" / forced re-auth after a password
// change works without a DB-backed session table.
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const COOKIE_NAME = "nobs_session";

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

// Secure cookies are silently dropped by real browsers over plain http://
// (localhost dev), so it's only appended outside local development.
function secureFlag(env: Env): string {
  return env.ENVIRONMENT === "development" ? "" : " Secure;";
}

// Host-only by default (no Domain=), which would NOT share the cookie
// between nobslifestyle.com and admin.nobslifestyle.com — needed so an
// impersonation session started from the admin subdomain carries over when
// the browser is sent to the main app. Skipped in dev (localhost has no
// meaningful subdomain to share with).
function cookieDomain(env: Env): string {
  if (env.ENVIRONMENT === "development") return "";
  try {
    return `; Domain=.${new URL(env.APP_URL).hostname}`;
  } catch {
    return "";
  }
}

export interface SessionPayload {
  userId: number;
  tokenVersion: number;
  exp: number;
  // Set only on an impersonation session: the real admin's user id, so
  // "return to admin" can restore their session and the frontend can show
  // a "Viewing as X" banner. Absent on every normal session.
  impersonatedBy?: number;
}

export interface MakeSessionCookieOptions {
  impersonatedBy?: number;
  ttlSeconds?: number;
}

export async function makeSessionCookie(
  env: Env,
  userId: number,
  tokenVersion: number,
  opts?: MakeSessionCookieOptions
): Promise<string> {
  const ttlSeconds = opts?.ttlSeconds ?? TTL_SECONDS;
  const exp = Date.now() + ttlSeconds * 1000;
  const payloadObj: SessionPayload = { userId, tokenVersion, exp };
  if (opts?.impersonatedBy != null) payloadObj.impersonatedBy = opts.impersonatedBy;

  const payload = b64url(new TextEncoder().encode(JSON.stringify(payloadObj)));
  const sig = await sign(payload, env.SESSION_SECRET);
  return `${COOKIE_NAME}=${payload}.${sig}; Path=/; Max-Age=${ttlSeconds}; HttpOnly;${secureFlag(env)}${cookieDomain(env)} SameSite=Lax`;
}

export function clearSessionCookie(env: Env): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly;${secureFlag(env)}${cookieDomain(env)} SameSite=Lax`;
}

function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function verifySession(env: Env, cookieHeader: string | null): Promise<SessionPayload | null> {
  const raw = getCookie(cookieHeader, COOKIE_NAME);
  if (!raw) return null;

  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;

  const expectedSig = await sign(payload, env.SESSION_SECRET);
  if (expectedSig !== sig) return null;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (typeof decoded.userId !== "number" || typeof decoded.tokenVersion !== "number" || typeof decoded.exp !== "number") {
      return null;
    }
    if (Date.now() >= decoded.exp) return null;
    return decoded as SessionPayload;
  } catch {
    return null;
  }
}
