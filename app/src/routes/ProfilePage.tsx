import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useProgressPhotos } from "../api/hooks/useProgressPhotos";
import { useSchemas } from "../api/hooks/useWorkouts";
import { ThemeToggle } from "../components/ThemeToggle";
import { ProgressPhotoGrid } from "../components/ProgressPhotoGrid";

function VerifyEmailBanner() {
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerified) return null;

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

  return (
    <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3">
      <p className="text-sm font-medium text-ink">Verify your email</p>
      <p className="mt-0.5 text-sm text-ink-muted">
        {status === "sent" ? "Check your inbox for a new link." : `We sent a link to ${user.email}.`}
      </p>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={resend}
        disabled={status === "sending"}
        className="mt-2 text-sm font-semibold text-accent disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Resend email"}
      </button>
      <button type="button" onClick={() => refresh()} className="ml-4 text-sm font-semibold text-ink-muted">
        I've verified — refresh
      </button>
    </div>
  );
}

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const { data: photos, isLoading: photosLoading } = useProgressPhotos();
  const { data: schemas } = useSchemas();
  const sharedSchemas = (schemas ?? []).filter((s) => s.visibility === "friends");

  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-end">
        <ThemeToggle />
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-2xl font-bold text-ink">
          {user?.displayName?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">{user?.displayName}</h1>
          <p className="text-sm text-ink-muted">{user?.email}</p>
          {user?.username && <p className="text-sm text-ink-muted">@{user.username}</p>}
        </div>
      </div>

      <VerifyEmailBanner />

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Progress photos</h2>
        <Link to="/profile/progress-photos/add" className="text-sm font-semibold text-accent">
          + Add
        </Link>
      </div>
      <div className="mt-2">
        {photosLoading ? (
          <p className="text-ink-muted">Loading…</p>
        ) : (
          <ProgressPhotoGrid photos={photos ?? []} editable />
        )}
      </div>

      {sharedSchemas.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Shared schemas</h2>
          <div className="mt-2 flex flex-col gap-2">
            {sharedSchemas.map((s) => (
              <Link
                key={s.id}
                to={`/workouts/${s.id}/edit`}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <p className="font-medium text-ink">{s.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-1 flex-col gap-2">
        <Link
          to="/profile/settings"
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-4"
        >
          <span className="font-medium text-ink">Settings</span>
          <span className="text-ink-muted">→</span>
        </Link>
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-6 rounded-xl border border-border px-4 py-3 font-semibold text-ink transition-colors hover:border-accent"
      >
        Log out
      </button>
    </div>
  );
}
