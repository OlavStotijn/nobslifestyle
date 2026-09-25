import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useProgressPhotos } from "../api/hooks/useProgressPhotos";
import { useSchemas } from "../api/hooks/useWorkouts";
import { useCreateWeightLog, useStreaks, useWeightLogs } from "../api/hooks/useProgress";
import { ThemeToggle } from "../components/ThemeToggle";
import { ProgressPhotoGrid } from "../components/ProgressPhotoGrid";
import { LineChart } from "../components/LineChart";
import { useUnits } from "../lib/useUnits";

function WeightSection() {
  const { data: logs } = useWeightLogs();
  const createLog = useCreateWeightLog();
  const { formatWeight, displayToKg, weightLabel } = useUnits();
  const [input, setInput] = useState("");

  async function add() {
    const kg = displayToKg(Number(input));
    if (!kg || kg <= 0) return;
    await createLog.mutateAsync({ weightKg: kg });
    setInput("");
  }

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Weight</h2>
      <div className="mt-2 rounded-2xl border border-border bg-surface p-4">
        {logs && logs.length > 0 ? (
          <>
            <LineChart points={logs.map((l) => l.weightKg)} />
            <p className="mt-2 text-center text-sm text-ink-muted">
              Latest: {formatWeight(logs[logs.length - 1].weightKg)}
              {weightLabel}
            </p>
          </>
        ) : (
          <p className="text-center text-sm text-ink-muted">Log your weight to start a trend line.</p>
        )}
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Weight (${weightLabel})`}
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={add}
            disabled={createLog.isPending || !input}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Log
          </button>
        </div>
      </div>
    </div>
  );
}

function StreaksSection() {
  const { data: streaks } = useStreaks();
  if (!streaks || (streaks.loggingStreakDays === 0 && streaks.workoutStreakDays === 0)) return null;

  return (
    <div className="mt-8 grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-surface-2 p-3 text-center">
        <p className="text-2xl font-bold text-accent">🔥{streaks.workoutStreakDays}</p>
        <p className="text-xs text-ink-muted">Workout streak</p>
      </div>
      <div className="rounded-xl bg-surface-2 p-3 text-center">
        <p className="text-2xl font-bold text-accent">🔥{streaks.loggingStreakDays}</p>
        <p className="text-xs text-ink-muted">Logging streak</p>
      </div>
    </div>
  );
}

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
      <StreaksSection />
      <WeightSection />

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
          to="/progress/prs"
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-4"
        >
          <span className="font-medium text-ink">Personal records</span>
          <span className="text-ink-muted">→</span>
        </Link>
        <Link
          to="/programs"
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-4"
        >
          <span className="font-medium text-ink">Programs</span>
          <span className="text-ink-muted">→</span>
        </Link>
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
