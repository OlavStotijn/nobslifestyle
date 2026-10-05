import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../api/client";

const PRO_PRICE_LABEL = "€4.99/month";

const PRO_FEATURES = [
  "AI meal scan — photograph a whole plate, get every item and its macros",
  "AI-generated workout plans tailored to your goals",
  "AI daily food plan suggestions",
  "AI dinner recipe ideas from what you have",
];

// Reached one of two ways: the native app's "Upgrade"/"Manage subscription"
// button (via the checkout-token bridge, which sets a session cookie before
// redirecting here — see worker/src/routes/billing.ts), or directly by
// someone browsing the website. Billing intentionally lives here and not in
// the native app, to avoid Apple's in-app-purchase cut entirely.
export function UpgradePage() {
  const { user, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setError(null);
    setBusy(true);
    try {
      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>("/billing/subscribe");
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start checkout. Please try again.");
      setBusy(false);
    }
  }

  async function cancel() {
    setError(null);
    setBusy(true);
    try {
      await api.post("/billing/cancel");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cancel. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-bg px-6 py-8 text-center">
        <h1 className="text-xl font-bold text-ink">Open this from the app</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Use the "Upgrade to Pro" button in NoBSLifestyle's Plan settings to get here with your account already
          signed in.
        </p>
      </div>
    );
  }

  const renewalDate = user.proUntil ? new Date(user.proUntil).toLocaleDateString() : null;

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-bg px-6 py-8">
      <h1 className="text-2xl font-bold text-ink">NoBSLifestyle Pro</h1>
      <p className="mt-1 text-ink-muted">{PRO_PRICE_LABEL}</p>

      <ul className="mt-6 flex flex-col gap-2">
        {PRO_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink">
            <span className="mt-0.5 text-accent">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {user.isPro ? (
        <>
          <div className="mt-6 rounded-xl border border-accent bg-accent-soft p-4">
            <p className="font-semibold text-ink">You're subscribed</p>
            {renewalDate && <p className="mt-1 text-sm text-ink-muted">Renews {renewalDate}</p>}
          </div>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="mt-4 rounded-xl border border-red-500 px-4 py-3 font-medium text-red-500 disabled:opacity-50"
          >
            {busy ? "Cancelling…" : "Cancel subscription"}
          </button>
          <p className="mt-2 text-center text-xs text-ink-muted">
            You'll keep Pro until {renewalDate ?? "the end of the current period"} — no refund for time already paid.
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={subscribe}
          disabled={busy}
          className="mt-6 rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Starting checkout…" : `Subscribe — ${PRO_PRICE_LABEL}`}
        </button>
      )}
    </div>
  );
}
