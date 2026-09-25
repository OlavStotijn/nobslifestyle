import type { Env } from "../types";

// VAPID-authenticated Web Push, no encrypted payload: the push message is
// just a wake-up signal (empty body, no Content-Encoding), and the service
// worker's `push` handler fetches the real notification text from
// /api/notifications/latest. That sidesteps implementing RFC 8291 payload
// encryption entirely while still working on every push service.

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jsonToB64url(obj: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}

async function signVapidJwt(env: Env, audience: string): Promise<string> {
  const jwk = JSON.parse(env.VAPID_PRIVATE_KEY_JWK);
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const header = { typ: "JWT", alg: "ES256" };
  const claims = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: "mailto:noreply@nobslifestyle.com",
  };
  const signingInput = `${jsonToB64url(header)}.${jsonToB64url(claims)}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${b64url(signature)}`;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushSendResult = "sent" | "expired" | "failed";

export async function sendWebPush(env: Env, sub: PushSubscriptionKeys): Promise<PushSendResult> {
  const audience = new URL(sub.endpoint).origin;
  const jwt = await signVapidJwt(env, audience);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      TTL: "60",
      "Content-Length": "0",
    },
  });

  if (res.status === 404 || res.status === 410) return "expired";
  if (!res.ok) {
    console.error("Web push send failed", res.status, await res.text().catch(() => ""));
    return "failed";
  }
  return "sent";
}
