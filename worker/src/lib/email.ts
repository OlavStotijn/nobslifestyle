import type { Env } from "../types";

// Cloudflare's native send_email binding, not a third-party vendor — same
// EmailMessageBuilder shape rvzn-audio-new/api/src/lib/orderEmail.ts uses,
// which already sends to arbitrary customer addresses with no destination
// allowlist. This builder form composes the raw MIME message internally
// (correct Message-ID etc.), unlike hand-building it via `cloudflare:email`.
// Requires Email Routing to be enabled on the nobslifestyle.com DNS zone.
async function send(env: Env, to: string, subject: string, html: string): Promise<void> {
  await env.SEND_EMAIL.send({ from: env.MAIL_FROM_ADDRESS, to, subject, html });
}

export async function sendVerificationEmail(env: Env, to: string, verifyUrl: string): Promise<void> {
  const html = `
    <p>Welcome to NoBSLifestyle — one more step.</p>
    <p><a href="${verifyUrl}">Click here to verify your email address</a>. This link expires in 24 hours.</p>
    <p>You can keep using the app in the meantime; some features may nudge you to verify.</p>
  `;
  await send(env, to, "Verify your NoBSLifestyle email", html);
}

export async function sendPasswordResetEmail(env: Env, to: string, resetUrl: string): Promise<void> {
  const html = `
    <p>Someone requested a password reset for your NoBSLifestyle account.</p>
    <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
    <p>If this wasn't you, you can safely ignore this email.</p>
  `;
  await send(env, to, "Reset your NoBSLifestyle password", html);
}

export async function sendFriendRequestEmail(env: Env, to: string, fromDisplayName: string): Promise<void> {
  const html = `
    <p><strong>${fromDisplayName}</strong> sent you a friend request on NoBSLifestyle.</p>
    <p><a href="${env.APP_URL}/friends">Open the app to accept or decline</a>.</p>
  `;
  await send(env, to, `${fromDisplayName} wants to be friends on NoBSLifestyle`, html);
}
