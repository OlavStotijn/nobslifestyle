// Shared transactional-email chrome. Table-based layout with inline styles
// only — this has to render correctly in Outlook/Gmail/Apple Mail without
// any external stylesheet, so no Tailwind classes here.
const BRAND_GREEN = "#337418";
const INK = "#171a16";
const INK_MUTED = "#6b6f6b";
const BORDER = "#e6e6e2";
const BG = "#f4f5f1";

export interface EmailTemplateInput {
  preheader: string; // short hidden summary shown in inbox previews, ahead of the body
  heading: string;
  bodyLines: string[]; // one <p> per entry
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string; // e.g. "This link expires in 1 hour."
}

export function renderEmailHtml(input: EmailTemplateInput): string {
  const bodyHtml = input.bodyLines.map((line) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">${line}</p>`).join("\n");

  const ctaHtml =
    input.ctaLabel && input.ctaUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
          <tr>
            <td style="border-radius:10px;background-color:${BRAND_GREEN};">
              <a href="${input.ctaUrl}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                ${input.ctaLabel}
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:${INK_MUTED};word-break:break-all;">
          Or paste this link into your browser: <a href="${input.ctaUrl}" style="color:${BRAND_GREEN};">${input.ctaUrl}</a>
        </p>`
      : "";

  const footnoteHtml = input.footnote
    ? `<p style="margin:0;font-size:13px;line-height:1.5;color:${INK_MUTED};">${input.footnote}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${input.heading}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${input.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0;">
                <p style="margin:0 0 20px;font-size:15px;font-weight:700;letter-spacing:0.02em;color:${INK};">
                  NoBS<span style="color:${BRAND_GREEN};">Lifestyle</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${INK};">${input.heading}</h1>
                ${bodyHtml}
                ${ctaHtml}
                ${footnoteHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px;border-top:1px solid ${BORDER};margin-top:8px;">
                <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${INK_MUTED};">
                  You're receiving this because it relates to your NoBSLifestyle account. If you didn't expect it, you can ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderEmailText(input: EmailTemplateInput): string {
  const lines = [input.heading, "", ...input.bodyLines.map(stripTags)];
  if (input.ctaLabel && input.ctaUrl) lines.push("", `${input.ctaLabel}: ${input.ctaUrl}`);
  if (input.footnote) lines.push("", stripTags(input.footnote));
  lines.push("", "— NoBSLifestyle", "If you didn't expect this email, you can ignore it.");
  return lines.join("\n");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}
