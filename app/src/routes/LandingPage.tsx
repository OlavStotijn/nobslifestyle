import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: "🏋️",
    title: "Build real schemas",
    body: "Set up your training schemas, run sessions, and adjust weight on the fly — permanently or just for today.",
  },
  {
    icon: "📈",
    title: "See real progress",
    body: "Every session is compared to your schema and your last time — PR, progress, or down. No guessing.",
  },
  {
    icon: "🏃",
    title: "GPS running & cycling",
    body: "Live distance, pace, and calories burned. Choose whether to add them back to today's food budget.",
  },
  {
    icon: "🍽️",
    title: "Food tracking, minus the hassle",
    body: "Search, scan a barcode, or snap a nutrition label. Meals are sorted by time automatically.",
  },
  {
    icon: "👥",
    title: "Train with friends",
    body: "Share sessions and runs to your feed, keep progress photos private or visible to friends only.",
  },
  {
    icon: "📱",
    title: "Install it like an app",
    body: "Works offline, installs to your home screen, no app store required.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-ink">NoBSLifestyle</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-semibold text-ink-muted">
              Log in
            </Link>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center text-center sm:mt-24">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-ink sm:text-6xl">
            Train hard. Eat right. <span className="text-accent">No fluff.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
            One app for your workouts, your runs, and your food — with real progress tracking, not vibes.
          </p>

          <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/signup"
              className="rounded-xl bg-accent px-8 py-3.5 text-center font-semibold text-white shadow-lg shadow-accent/20"
            >
              Get started — it's free
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-border px-8 py-3.5 text-center font-semibold text-ink"
            >
              Log in
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-4 sm:mt-28 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface p-6">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col items-center rounded-3xl border border-border bg-surface px-8 py-14 text-center sm:mt-28">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Ready to stop guessing?</h2>
          <p className="mt-2 max-w-md text-ink-muted">Create your account in under a minute. No credit card, no BS.</p>
          <Link
            to="/signup"
            className="mt-6 rounded-xl bg-accent px-8 py-3.5 text-center font-semibold text-white shadow-lg shadow-accent/20"
          >
            Create your account
          </Link>
        </div>

        <footer className="mt-16 flex flex-col items-center gap-1 pb-8 text-center text-xs text-ink-muted">
          <p>NoBSLifestyle.com</p>
          <p>Training, running, and food tracking — all in one place.</p>
        </footer>
      </div>
    </div>
  );
}
