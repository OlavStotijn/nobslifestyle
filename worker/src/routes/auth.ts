import { Hono } from "hono";
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
} from "../lib/users";
import { createPasswordResetToken, consumePasswordResetToken } from "../lib/passwordResetTokens";
import { createEmailVerificationToken, consumeEmailVerificationToken } from "../lib/emailVerificationTokens";
import { tooManyAttempts, hit, clear } from "../lib/rateLimit";
import { verifyTurnstileToken } from "../lib/turnstile";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email";

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
