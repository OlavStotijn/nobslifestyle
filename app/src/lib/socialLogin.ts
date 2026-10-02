import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { GOOGLE_CLIENT_ID_WEB, GOOGLE_CLIENT_ID_IOS, APPLE_SERVICES_ID } from "./socialLoginConfig";

// One shared init call: the plugin has to be initialized before login() on
// every platform, and on web it injects a script tag that needs a moment to
// load, so we kick this off once (module-level singleton) instead of on
// every button click.
let initPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_CLIENT_ID_WEB,
        iOSClientId: GOOGLE_CLIENT_ID_IOS,
        iOSServerClientId: GOOGLE_CLIENT_ID_WEB,
        // On web the plugin redirects back to this exact URL after the Google
        // popup — without it, it defaults to whatever page triggered the
        // login (e.g. /login vs /signup), which would need registering both.
        // Pinning it to the origin means only one Authorized redirect URI is
        // needed in Google Cloud Console, same reasoning as Apple's below.
        redirectUrl: window.location.origin,
      },
      apple: {
        clientId: APPLE_SERVICES_ID,
        // On web this must exactly match a "Return URL" registered against
        // the Services ID in Apple Developer — using the origin (not the
        // full path) keeps it stable across /login and /signup. On native
        // iOS there's no web redirect involved, and an empty string is what
        // the plugin docs call for to suppress one.
        redirectUrl: Capacitor.getPlatform() === "ios" ? "" : window.location.origin,
      },
    });
  }
  return initPromise;
}

export interface OAuthSignInResult {
  idToken: string;
  fullName?: string;
}

export async function signInWithGoogle(): Promise<OAuthSignInResult> {
  await ensureInitialized();
  const { result } = await SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"] } });
  if (result.responseType !== "online" || !result.idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }
  return { idToken: result.idToken };
}

export async function signInWithApple(): Promise<OAuthSignInResult> {
  await ensureInitialized();
  const { result } = await SocialLogin.login({ provider: "apple", options: { scopes: ["email", "name"] } });
  if (!result.idToken) throw new Error("Apple sign-in did not return an ID token.");

  // Apple only ever includes the name on the very first authorization for a
  // given app, and never inside the ID token itself — so we forward it once
  // here for the backend to use as the initial display name.
  const fullName = [result.profile.givenName, result.profile.familyName].filter(Boolean).join(" ");
  return { idToken: result.idToken, fullName: fullName || undefined };
}
