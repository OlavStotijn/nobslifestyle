import type { Env } from "../types";
import { renderEmailHtml, renderEmailText, type EmailTemplateInput } from "./emailTemplate";

// Cloudflare's native send_email binding, not a third-party vendor — same
// EmailMessageBuilder shape rvzn-audio-new/api/src/lib/orderEmail.ts uses,
// which already sends to arbitrary customer addresses with no destination
// allowlist. This builder form composes the raw MIME message internally
// (correct Message-ID etc.), unlike hand-building it via `cloudflare:email`.
// Requires Email Routing to be enabled on the nobslifestyle.com DNS zone.
//
// Deliverability note: a well-formed message alone doesn't keep transactional
// mail out of spam — that also needs SPF/DKIM/DMARC records on the sending
// domain, set up once in the Cloudflare dashboard (Email > Email Routing),
// which is outside what this Worker's code controls.
async function send(env: Env, to: string, subject: string, template: EmailTemplateInput): Promise<void> {
  await env.SEND_EMAIL.send({
    from: env.MAIL_FROM_ADDRESS,
    to,
    subject,
    html: renderEmailHtml(template),
    text: renderEmailText(template),
  });
}

export async function sendVerificationEmail(env: Env, to: string, verifyUrl: string): Promise<void> {
  await send(env, to, "Verify your NoBSLifestyle email", {
    preheader: "One more step before you're fully set up.",
    heading: "Verify your email",
    bodyLines: [
      "Welcome to NoBSLifestyle — one more step.",
      "You can keep using the app in the meantime; some features may nudge you to verify.",
    ],
    ctaLabel: "Verify email address",
    ctaUrl: verifyUrl,
    footnote: "This link expires in 24 hours.",
  });
}

export async function sendPasswordResetEmail(env: Env, to: string, resetUrl: string): Promise<void> {
  await send(env, to, "Reset your NoBSLifestyle password", {
    preheader: "Reset your password to get back into your account.",
    heading: "Reset your password",
    bodyLines: [
      "Someone requested a password reset for your NoBSLifestyle account.",
      "If this wasn't you, you can safely ignore this email — your password won't change.",
    ],
    ctaLabel: "Choose a new password",
    ctaUrl: resetUrl,
    footnote: "This link expires in 1 hour.",
  });
}

export async function sendFriendRequestEmail(env: Env, to: string, fromDisplayName: string): Promise<void> {
  await send(env, to, `${fromDisplayName} wants to be friends on NoBSLifestyle`, {
    preheader: `${fromDisplayName} sent you a friend request.`,
    heading: "New friend request",
    bodyLines: [`<strong>${fromDisplayName}</strong> sent you a friend request on NoBSLifestyle.`],
    ctaLabel: "Open the app",
    ctaUrl: `${env.APP_URL}/friends`,
  });
}
