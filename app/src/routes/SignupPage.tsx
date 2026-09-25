import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { TurnstileWidget } from "../components/TurnstileWidget";
import type { User } from "../context/AuthContext";

export function SignupPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await api.post<{ user: User }>("/auth/signup", {
        email,
        password,
        displayName,
        turnstileToken,
      });
      setUser(user);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-3xl font-bold text-ink">Get started</h1>
        <p className="mt-2 text-ink-muted">Track your training and your food. No fluff.</p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Name</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
            <span className="text-xs text-ink-muted">At least 8 characters.</span>
          </label>

          <TurnstileWidget onToken={setTurnstileToken} />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !turnstileToken}
            className="mt-2 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
