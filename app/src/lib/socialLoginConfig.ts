// Google/Apple OAuth client identifiers — public by design (they're the
// "aud" a client puts in its ID token request, not a secret; the matching
// server-side check lives in worker/src/lib/oauth.ts). Same convention as
// TurnstileWidget's SITE_KEY. Fill these in once the credentials exist in
// Google Cloud Console / Apple Developer — see the sign-in setup notes.
export const GOOGLE_CLIENT_ID_WEB = "";
export const GOOGLE_CLIENT_ID_IOS = "";
export const APPLE_SERVICES_ID = "";
