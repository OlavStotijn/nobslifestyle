import { Link } from "react-router-dom";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/" className="text-sm text-ink-muted">
          ← NoBSLifestyle
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-ink">Privacy Policy</h1>
        <p className="mt-1 text-sm text-ink-muted">Last updated: October 2, 2026</p>

        <Section title="Who we are">
          <p>
            NoBSLifestyle ("we", "us") operates nobslifestyle.com and the NoBSLifestyle mobile app. This policy
            explains what data we collect, why, and the choices you have. Questions or requests can be sent to{" "}
            <a href="mailto:olavstotijn@gmail.com" className="text-accent">
              olavstotijn@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="What we collect">
          <p>Account basics: email address, display name, optional username, and your password (stored as a salted hash — we never see or store it in plain text).</p>
          <p>
            Training data you enter: workout schemas and sessions, cardio sessions (including GPS route and distance
            if you track a run or ride), food logs, water intake, body weight, progress photos, personal records, and
            checklist items.
          </p>
          <p>
            Social features: friend connections, feed posts, comments, and anything you choose to share with friends
            or publicly within the app.
          </p>
          <p>
            Photos you upload for food logging or nutrition-label scanning are processed to extract nutrition
            information and to check they don't violate our content guidelines (see "How we use your data" below).
          </p>
          <p>
            If you sign in with Google or Apple, we receive the account identifier, email address, and name those
            providers share with us — we never see your Google or Apple password.
          </p>
          <p>Device and technical data: your IP address (used for abuse/rate-limit protection), language and unit preferences, and a push-notification subscription if you enable notifications.</p>
        </Section>

        <Section title="How we use your data">
          <p>To provide the core functionality: storing and displaying your training, food, and progress data back to you.</p>
          <p>
            To run nutrition-label and food-photo scanning and to automatically screen uploaded photos and posts for
            content that violates our guidelines, we send the relevant image to Cloudflare Workers AI for processing.
          </p>
          <p>To look up food products by barcode, we query the public Open Food Facts database with the barcode you scan — no personal data is sent with that request.</p>
          <p>To send account emails (password reset, email verification) and, if you opt in, push notifications (workout reminders, reminders you've set, and social activity on your account).</p>
          <p>To protect the service from bots and abuse, sign-up forms are checked by Cloudflare Turnstile.</p>
          <p>We do not sell your data, and we do not use it for advertising.</p>
        </Section>

        <Section title="Who we share it with">
          <p>We use a small number of service providers (subprocessors) to run NoBSLifestyle:</p>
          <ul className="list-disc pl-5">
            <li>Cloudflare — hosting, database, file storage, email delivery, bot protection, and AI image/text processing.</li>
            <li>Google and Apple — only if you choose to sign in with those providers.</li>
            <li>Open Food Facts — public barcode lookups, no account data shared.</li>
          </ul>
          <p>We don't share your data with anyone else, except where required by law.</p>
        </Section>

        <Section title="Your choices and rights">
          <p>
            You can export your workout history and food log at any time from Settings → Export your data. You can
            change your language, units, and notification preferences at any time in Settings.
          </p>
          <p>
            If you're in the EU/EEA or UK, you have the right to access, correct, export, or delete your personal
            data, and to object to or restrict certain processing. To exercise any of these rights, email{" "}
            <a href="mailto:olavstotijn@gmail.com" className="text-accent">
              olavstotijn@gmail.com
            </a>{" "}
            — we'll handle account deletion requests within a reasonable time. You also have the right to lodge a
            complaint with your local data protection authority (in the Netherlands, the Autoriteit Persoonsgegevens).
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use a small number of strictly necessary cookies to keep you signed in and to protect the app from
            abuse (see our{" "}
            <Link to="/terms" className="text-accent">
              Terms of Service
            </Link>
            ). If you sign in with Google or Apple, those providers may set their own cookies during that sign-in —
            this only happens if you click one of those buttons. We don't use advertising or analytics cookies.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            We keep your data for as long as your account is active. If you ask us to delete your account, we delete
            or anonymize your personal data, except where we're required to keep records for a longer period by law.
          </p>
        </Section>

        <Section title="Children">
          <p>NoBSLifestyle is not directed at, and should not be used by, anyone under the age of 16.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>If we make material changes to this policy, we'll update the date at the top of this page.</p>
        </Section>
      </div>
    </div>
  );
}
