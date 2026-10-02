// Google/Apple OAuth client identifiers — public by design (they're the
// "aud" a client puts in its ID token request, not a secret; the matching
// server-side check lives in worker/src/lib/oauth.ts). Same convention as
// TurnstileWidget's SITE_KEY. Fill these in once the credentials exist in
// Google Cloud Console / Apple Developer — see the sign-in setup notes.
export const GOOGLE_CLIENT_ID_WEB = "187351487467-9k8avai3vtuo341turauqib3sptq5n5n.apps.googleusercontent.com";
export const GOOGLE_CLIENT_ID_IOS = "187351487467-kej2emqeoj3lua7bkgqd29mp52qb57up.apps.googleusercontent.com";
export const APPLE_SERVICES_ID = "com.nobslifestyle.app.web";
