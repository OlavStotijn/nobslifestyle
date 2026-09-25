import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";

// Hard gate shown right after signup — onboarding (and the rest of the app)
// stays locked until the user clicks the link in their verification email.
export function VerifyEmailRequiredPage() {
  const { user, setUser, refresh } = useAuth();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setStatus("sending");
    setError(null);
    try {
      await api.post("/auth/resend-verification");
      setStatus("sent");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  async function checkAgain() {
    setChecking(true);
    setError(null);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col justify-center text-center">
        <h1 className="text-2xl font-bold text-ink">Verify your email</h1>
        <p className="mt-2 text-ink-muted">
          We sent a link to <span className="text-ink">{user?.email}</span>. Click it, then come back here.
        </p>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={checkAgain}
          disabled={checking}
          className="mt-8 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {checking ? "Checking…" : "I've verified — continue"}
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={status === "sending"}
          className="mt-3 rounded-xl border border-border px-4 py-3 font-semibold text-ink disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : status === "sent" ? "Email sent — resend again" : "Resend email"}
        </button>

        <button type="button" onClick={logout} className="mt-6 text-sm text-ink-muted">
          Log out
        </button>
      </div>
    </div>
  );
}
