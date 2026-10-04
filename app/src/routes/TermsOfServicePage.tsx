import { Link } from "react-router-dom";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export function TermsOfServicePage() {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/" className="text-sm text-ink-muted">
          ← NoBSLifestyle
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-ink">Terms of Service</h1>
        <p className="mt-1 text-sm text-ink-muted">Last updated: October 2, 2026</p>

        <Section title="Agreement">
          <p>
            By creating an account or using NoBSLifestyle ("the app"), you agree to these Terms and to our{" "}
            <Link to="/privacy" className="text-accent">
              Privacy Policy
            </Link>
            . If you don't agree, please don't use the app.
          </p>
        </Section>

        <Section title="The service">
          <p>
            NoBSLifestyle is a training, running/cycling, and food-tracking app. It's currently offered free of
            charge. We may introduce paid features in the future; if we do, we'll tell you clearly before you're
            charged anything.
          </p>
        </Section>

        <Section title="Not medical advice">
          <p>
            NoBSLifestyle is a tracking tool, not a medical device or a substitute for professional medical, nutrition,
            or fitness advice. Talk to a qualified professional before starting a new training or nutrition program,
            especially if you have an existing health condition.
          </p>
        </Section>

        <Section title="Your account">
          <p>You're responsible for keeping your login credentials secure and for all activity under your account. Tell us right away if you think your account has been compromised.</p>
          <p>You must be at least 16 years old to use NoBSLifestyle.</p>
        </Section>

        <Section title="Your content">
          <p>
            You keep ownership of the photos, posts, comments, and other content you upload. By posting content
            that's visible to friends or publicly within the app, you give us permission to store and display it as
            part of operating the app.
          </p>
          <p>
            Don't post content that's illegal, harassing, hateful, or that infringes someone else's rights. We use
            automated screening plus user reports (use the ⋯ menu on a post or comment to report it or block its author) to catch content that violates these guidelines, and we may remove
            content or suspend accounts that violate them.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>Don't try to break, reverse-engineer, scrape, or abuse the app or its API, and don't use it to harm or harass other users.</p>
        </Section>

        <Section title="Termination">
          <p>
            You can delete your account at any time from Settings → Delete account, which permanently removes your
            data. We may suspend or terminate accounts that violate these Terms.
          </p>
        </Section>

        <Section title="No warranty, limitation of liability">
          <p>
            NoBSLifestyle is provided "as is", without warranties of any kind. To the extent permitted by law, we're
            not liable for indirect, incidental, or consequential damages arising from your use of the app.
          </p>
        </Section>

        <Section title="Changes">
          <p>We may update these Terms from time to time. If we make material changes, we'll update the date at the top of this page.</p>
        </Section>

        <Section title="Governing law">
          <p>These Terms are governed by the laws of the Netherlands, without regard to conflict-of-law principles.</p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these Terms?{" "}
            <a href="mailto:olavstotijn@gmail.com" className="text-accent">
              olavstotijn@gmail.com
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}
