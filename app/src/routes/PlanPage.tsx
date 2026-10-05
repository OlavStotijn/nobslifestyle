import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import { useCheckoutToken } from "../api/hooks/useBilling";
import { ApiError } from "../api/client";

const PRO_FEATURES = [
  "AI meal scan — photograph a whole plate, get every item and its macros",
  "AI-generated workout plans tailored to your goals",
  "AI daily food plan suggestions",
  "AI dinner recipe ideas from what you have",
];

const BASIC_FEATURES = ["Everything else in the app — workouts, food logging, checklist, feed, reports"];

function FeatureRow({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-ink">
      <span className="mt-0.5 text-accent">✓</span>
      <span>{label}</span>
    </li>
  );
}

export function PlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const checkoutToken = useCheckoutToken();
  const [error, setError] = useState<string | null>(null);

  // Billing lives on the website (nobslifestyle.com), not in this native
  // shell — avoids Apple's IAP cut entirely. The checkout-token bridge lets
  // the external browser land there already logged in as this account.
  async function goToWebsite() {
    setError(null);
    try {
      const url = await checkoutToken.mutateAsync();
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url });
      } else {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open checkout. Please try again.");
    }
  }

  const renewalDate = user?.proUntil ? new Date(user.proUntil).toLocaleDateString() : null;

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/profile")} className="self-start text-sm text-ink-muted">
        ← Back
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">Plan</h1>

      <div className="mt-4 rounded-xl border border-accent bg-accent-soft p-4">
        <p className="font-semibold text-ink">{user?.isPro ? "You're on Pro" : "You're on Basic"}</p>
        {user?.isPro && renewalDate && <p className="mt-1 text-sm text-ink-muted">Renews {renewalDate}</p>}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Basic</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {BASIC_FEATURES.map((f) => (
            <FeatureRow key={f} label={f} />
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Pro</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {PRO_FEATURES.map((f) => (
            <FeatureRow key={f} label={f} />
          ))}
        </ul>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={goToWebsite}
        disabled={checkoutToken.isPending}
        className="mt-6 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {checkoutToken.isPending ? "Opening…" : user?.isPro ? "Manage subscription" : "Upgrade to Pro"}
      </button>
    </div>
  );
}
