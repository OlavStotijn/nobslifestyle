import { Hono, type Context } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { hashPassword, verifyPassword } from "../lib/passwordHash";
import { clearSessionCookie, makeSessionCookie } from "../lib/session";
import {
  createUser,
  findUserByEmail,
  getUserById,
  markEmailVerified,
  publicUser,
  setPasswordAndBumpTokenVersion,
  type UserRow,
} from "../lib/users";
import { createPasswordResetToken, consumePasswordResetToken } from "../lib/passwordResetTokens";
import { createEmailVerificationToken, consumeEmailVerificationToken } from "../lib/emailVerificationTokens";
import { tooManyAttempts, hit, clear } from "../lib/rateLimit";
import { verifyTurnstileToken } from "../lib/turnstile";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email";
import {
  verifyIdToken,
  GOOGLE_JWKS_URL,
  GOOGLE_ISSUERS,
  APPLE_JWKS_URL,
  APPLE_ISSUERS,
  type VerifiedIdToken,
} from "../lib/oauth";
import { findUserIdByOAuthIdentity, linkOAuthIdentity, type OAuthProvider } from "../lib/oauthIdentities";

async function sendVerificationEmailBestEffort(env: Env, userId: number, email: string): Promise<void> {
  try {
    const token = await createEmailVerificationToken(env, userId);
    const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;
    await sendVerificationEmail(env, email, verifyUrl);
  } catch (err) {
    // Signup must succeed even if the email provider hiccups — the user can
    // always hit "resend" from the app once logged in.
    console.error("sendVerificationEmailBestEffort failed", err);
  }
}

export const authRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function clientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header("CF-Connecting-IP") ?? "unknown";
}

interface SignupBody {
  email: string;
  password: string;
  displayName: string;
  username?: string;
  turnstileToken?: string;
}

authRoute.post("/api/auth/signup", async (c) => {
  const ip = clientIp(c);
  if (await tooManyAttempts(c.env, "signup", ip, 5)) {
    return c.json({ error: "Too many signup attempts. Try again later." }, 429);
  }

  const body = await c.req.json<Partial<SignupBody>>().catch(() => null);
  if (!body?.email || !body.password || body.password.length < 8 || !body.displayName) {
    await hit(c.env, "signup", ip, 15 * 60 * 1000);
    return c.json({ error: "Email, a password of at least 8 characters, and a display name are required." }, 422);
  }

  const turnstileOk = await verifyTurnstileToken(c.env, body.turnstileToken, ip);
  if (!turnstileOk) {
    await hit(c.env, "signup", ip, 15 * 60 * 1000);
    return c.json({ error: "Bot verification failed, please try again." }, 422);
  }

  const existing = await findUserByEmail(c.env, body.email);
  if (existing) {
    await hit(c.env, "signup", ip, 15 * 60 * 1000);
    return c.json({ error: "An account with this email already exists." }, 422);
  }

  if (body.username) {
    const usernameTaken = await c.env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(body.username).first();
    if (usernameTaken) return c.json({ error: "That username is already taken." }, 422);
  }

  const user = await createUser(c.env, {
    email: body.email,
    passwordHash: hashPassword(body.password),
    displayName: body.displayName,
    username: body.username ?? null,
  });

  c.executionCtx.waitUntil(sendVerificationEmailBestEffort(c.env, user.id, user.email));

  const cookie = await makeSessionCookie(c.env, user.id, user.token_version);
  c.header("Set-Cookie", cookie);
  return c.json({ user: publicUser(user) }, 201);
});

interface LoginBody {
  email: string;
  password: string;
}

authRoute.post("/api/auth/login", async (c) => {
  const ip = clientIp(c);
  if (await tooManyAttempts(c.env, "login", ip, 10)) {
    return c.json({ error: "Too many login attempts. Try again later." }, 429);
  }

  const body = await c.req.json<Partial<LoginBody>>().catch(() => null);
  if (!body?.email || !body.password) {
    return c.json({ error: "Email and password are required." }, 422);
  }

  const user = await findUserByEmail(c.env, body.email);
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    await hit(c.env, "login", ip, 15 * 60 * 1000);
    return c.json({ error: "Invalid email or password." }, 401);
  }

  await clear(c.env, "login", ip);
  const cookie = await makeSessionCookie(c.env, user.id, user.token_version);
  c.header("Set-Cookie", cookie);
  return c.json({ user: publicUser(user) });
});

// Google/Apple both attest email ownership in the ID token itself
// (email_verified), so a sign-in via either provider skips our own
// verify-email flow entirely — new accounts are created already verified,
// and any existing unverified account gets marked verified on first link.
async function completeOAuthSignIn(
  c: Context<{ Bindings: Env; Variables: AuthVariables }>,
  provider: OAuthProvider,
  verified: VerifiedIdToken,
  fallbackDisplayName: string
) {
  if (!verified.email || !verified.emailVerified) {
    return c.json({ error: "This account's email address could not be verified by the provider." }, 422);
  }

  let userId = await findUserIdByOAuthIdentity(c.env, provider, verified.sub);

  if (!userId) {
    const existing = await findUserByEmail(c.env, verified.email);
    if (existing) {
      userId = existing.id;
      if (!existing.email_verified_at) {
        // The existing account's email was never proven, which means
        // whoever set its password might not be the real owner of this
        // address (e.g. someone pre-registered the victim's email hoping
        // they'd later sign in with a provider and inherit the account).
        // The provider just proved real ownership, so reclaim the account
        // by invalidating that unverified password rather than letting
        // both the provider and the original password holder into it.
        await setPasswordAndBumpTokenVersion(
          c.env,
          existing.id,
          hashPassword(`${crypto.randomUUID()}${crypto.randomUUID()}`)
        );
      }
    } else {
      const unusablePassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const created = await createUser(c.env, {
        email: verified.email,
        passwordHash: hashPassword(unusablePassword),
        displayName: verified.name || fallbackDisplayName,
        username: null,
      });
      userId = created.id;
    }
    await linkOAuthIdentity(c.env, userId, provider, verified.sub);
  }

  let user = await getUserById(c.env, userId);
  if (!user) return c.json({ error: "Not found." }, 404);

  if (!user.email_verified_at) {
    await markEmailVerified(c.env, user.id);
    user = { ...user, email_verified_at: new Date().toISOString() } satisfies UserRow;
  }

  const cookie = await makeSessionCookie(c.env, user.id, user.token_version);
  c.header("Set-Cookie", cookie);
  return c.json({ user: publicUser(user) });
}

interface OAuthBody {
  idToken: string;
}

authRoute.post("/api/auth/oauth/google", async (c) => {
  const ip = clientIp(c);
  if (await tooManyAttempts(c.env, "oauth", ip, 20)) {
    return c.json({ error: "Too many attempts. Try again later." }, 429);
  }

  const body = await c.req.json<Partial<OAuthBody>>().catch(() => null);
  if (!body?.idToken) return c.json({ error: "An ID token is required." }, 422);

  const audiences = [c.env.GOOGLE_CLIENT_ID_WEB, c.env.GOOGLE_CLIENT_ID_IOS, c.env.GOOGLE_CLIENT_ID_ANDROID].filter(
    Boolean
  );

  let verified: VerifiedIdToken;
  try {
    verified = await verifyIdToken({
      idToken: body.idToken,
      jwksUrl: GOOGLE_JWKS_URL,
      issuers: GOOGLE_ISSUERS,
      audiences,
    });
  } catch (err) {
    console.error("Google ID token verification failed", err);
    await hit(c.env, "oauth", ip, 15 * 60 * 1000);
    return c.json({ error: "Google sign-in could not be verified." }, 401);
  }

  return completeOAuthSignIn(c, "google", verified, "Google user");
});

interface AppleOAuthBody extends OAuthBody {
  // Apple only ever includes the user's name in its authorization response
  // on the very first sign-in, never in the ID token — the client passes it
  // along once so we can use it as the initial display name.
  fullName?: string;
}

authRoute.post("/api/auth/oauth/apple", async (c) => {
  const ip = clientIp(c);
  if (await tooManyAttempts(c.env, "oauth", ip, 20)) {
    return c.json({ error: "Too many attempts. Try again later." }, 429);
  }

  const body = await c.req.json<Partial<AppleOAuthBody>>().catch(() => null);
  if (!body?.idToken) return c.json({ error: "An ID token is required." }, 422);

  const audiences = [c.env.APPLE_SERVICES_ID, c.env.APPLE_BUNDLE_ID].filter(Boolean);

  let verified: VerifiedIdToken;
  try {
    verified = await verifyIdToken({
      idToken: body.idToken,
      jwksUrl: APPLE_JWKS_URL,
      issuers: APPLE_ISSUERS,
      audiences,
    });
  } catch (err) {
    console.error("Apple ID token verification failed", err);
    await hit(c.env, "oauth", ip, 15 * 60 * 1000);
    return c.json({ error: "Apple sign-in could not be verified." }, 401);
  }

  return completeOAuthSignIn(c, "apple", { ...verified, name: verified.name ?? body.fullName ?? null }, "Apple user");
});

authRoute.post("/api/auth/logout", async (c) => {
  c.header("Set-Cookie", clearSessionCookie(c.env));
  return c.json({ ok: true });
});

authRoute.get("/api/auth/me", requireAuth, async (c) => {
  const user = await getUserById(c.env, c.get("userId"));
  if (!user) return c.json({ error: "Not found." }, 404);
  return c.json({ user: publicUser(user) });
});

interface ForgotPasswordBody {
  email: string;
}

authRoute.post("/api/auth/forgot-password", async (c) => {
  const ip = clientIp(c);
  if (await tooManyAttempts(c.env, "forgot-password", ip, 5)) {
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }
  await hit(c.env, "forgot-password", ip, 15 * 60 * 1000);

  const body = await c.req.json<Partial<ForgotPasswordBody>>().catch(() => null);
  if (!body?.email) return c.json({ error: "Email is required." }, 422);

  // Always respond 200 regardless of whether the account exists, so the
  // endpoint can't be used to enumerate registered emails.
  const user = await findUserByEmail(c.env, body.email);
  if (user) {
    const token = await createPasswordResetToken(c.env, user.id);
    const resetUrl = `${c.env.APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(c.env, user.email, resetUrl);
  }

  return c.json({ ok: true });
});

interface ResetPasswordBody {
  token: string;
  password: string;
}

authRoute.post("/api/auth/reset-password", async (c) => {
  const body = await c.req.json<Partial<ResetPasswordBody>>().catch(() => null);
  if (!body?.token || !body.password || body.password.length < 8) {
    return c.json({ error: "A reset token and a password of at least 8 characters are required." }, 422);
  }

  const userId = await consumePasswordResetToken(c.env, body.token);
  if (!userId) return c.json({ error: "This reset link is invalid or has expired." }, 422);

  await setPasswordAndBumpTokenVersion(c.env, userId, hashPassword(body.password));
  return c.json({ ok: true });
});

interface VerifyEmailBody {
  token: string;
}

authRoute.post("/api/auth/verify-email", async (c) => {
  const body = await c.req.json<Partial<VerifyEmailBody>>().catch(() => null);
  if (!body?.token) return c.json({ error: "A verification token is required." }, 422);

  const userId = await consumeEmailVerificationToken(c.env, body.token);
  if (!userId) return c.json({ error: "This verification link is invalid or has expired." }, 422);

  await markEmailVerified(c.env, userId);
  return c.json({ ok: true });
});

authRoute.post("/api/auth/resend-verification", requireAuth, async (c) => {
  const ip = clientIp(c);
  if (await tooManyAttempts(c.env, "resend-verification", ip, 3)) {
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }
  await hit(c.env, "resend-verification", ip, 15 * 60 * 1000);

  const user = await getUserById(c.env, c.get("userId"));
  if (!user) return c.json({ error: "Not found." }, 404);
  if (user.email_verified_at) return c.json({ ok: true, alreadyVerified: true });

  await sendVerificationEmailBestEffort(c.env, user.id, user.email);
  return c.json({ ok: true });
});
