// One-off VAPID (Web Push) keypair generator. Run with `node scripts/gen-vapid-keys.mjs`.
// Outputs the public key (safe to hardcode as a wrangler var, used client-side
// as applicationServerKey) and the private key JWK (must be a wrangler secret).
import { webcrypto } from "node:crypto";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

const keyPair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);

const publicJwk = await webcrypto.subtle.exportKey("jwk", keyPair.publicKey);
const privateJwk = await webcrypto.subtle.exportKey("jwk", keyPair.privateKey);

// Raw uncompressed EC point (0x04 || X || Y), 65 bytes — the format browsers'
// PushManager.subscribe({applicationServerKey}) expects.
const x = Buffer.from(publicJwk.x, "base64url");
const y = Buffer.from(publicJwk.y, "base64url");
const rawPublicKey = Buffer.concat([Buffer.from([0x04]), x, y]);

console.log("VAPID_PUBLIC_KEY (wrangler var, safe to commit):");
console.log(b64url(rawPublicKey));
console.log();
console.log("VAPID_PRIVATE_KEY_JWK (wrangler secret, DO NOT commit):");
console.log(JSON.stringify(privateJwk));
