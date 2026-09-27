// Verifies Google/Apple "ID tokens" (signed JWTs) server-side, so a client
// can prove who signed in without our Worker ever handling an OAuth client
// secret or authorization-code exchange. Both providers issue RS256 JWTs
// against a published JWKS, so one generic verifier covers both.

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
}

interface Jwks {
  keys: Jwk[];
}

// Keyed by JWKS URL. Workers reuse a warm isolate across requests, so this
// often avoids re-fetching the key set; if the isolate is cold or the cache
// is stale it just refetches — correctness never depends on the cache hit.
const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchJwks(url: string): Promise<Jwk[]> {
  const cached = jwksCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < JWKS_CACHE_TTL_MS) return cached.keys;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch JWKS from ${url}: ${res.status}`);
  const data = await res.json<Jwks>();
  jwksCache.set(url, { keys: data.keys, fetchedAt: Date.now() });
  return data.keys;
}

function b64urlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToJson<T>(s: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s))) as T;
}

export interface VerifiedIdToken {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

interface IdTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
}

export async function verifyIdToken(params: {
  idToken: string;
  jwksUrl: string;
  issuers: string[];
  audiences: string[];
}): Promise<VerifiedIdToken> {
  const { idToken, jwksUrl, issuers, audiences } = params;
  if (audiences.length === 0) throw new Error("No audience configured for this provider.");

  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token.");
  const [headerB64, payloadB64, sigB64] = parts;

  const header = b64urlToJson<{ alg: string; kid: string }>(headerB64);
  if (header.alg !== "RS256") throw new Error("Unsupported ID token algorithm.");

  const keys = await fetchJwks(jwksUrl);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("No matching signing key found for ID token.");

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, b64urlToBytes(sigB64), signedData);
  if (!valid) throw new Error("ID token signature verification failed.");

  const payload = b64urlToJson<IdTokenPayload>(payloadB64);

  if (!issuers.includes(payload.iss)) throw new Error("Unexpected ID token issuer.");
  if (!audiences.includes(payload.aud)) throw new Error("Unexpected ID token audience.");
  if (Date.now() / 1000 >= payload.exp) throw new Error("ID token has expired.");

  return {
    sub: payload.sub,
    email: payload.email ?? null,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: payload.name ?? null,
  };
}

export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
export const APPLE_ISSUERS = ["https://appleid.apple.com"];
