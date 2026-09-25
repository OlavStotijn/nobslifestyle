import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSchemas } from "../api/hooks/useWorkouts";
import { useSessions, useStartSession, type Badge } from "../api/hooks/useSessions";
import { useTodaysWorkout } from "../api/hooks/usePrograms";
import { ThemeToggle } from "../components/ThemeToggle";
import { BottomSheet } from "../components/BottomSheet";
import { ApiError } from "../api/client";

const BADGE_LABEL: Record<Badge, string> = {
  pr: "PR",
  progress: "Progress",
  on_target: "On target",
  regression: "Down",
};

const BADGE_CLASS: Record<Badge, string> = {
  pr: "bg-accent text-white",
  progress: "bg-accent-soft text-accent",
  on_target: "bg-surface-2 text-ink-muted",
  regression: "bg-red-500/15 text-red-500",
};

type ChooserStep = "closed" | "type" | "schema";

function StartSessionSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ChooserStep>("type");
  const { data: schemas } = useSchemas();
  const navigate = useNavigate();
  const startSession = useStartSession();
  const [error, setError] = useState<string | null>(null);

  async function pickSchema(schemaId: number) {
    setError(null);
    try {
      const session = await startSession.mutateAsync(schemaId);
      navigate(`/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start session.");
    }
  }

  return (
    <BottomSheet open={step !== "closed"} onClose={onClose}>
      {step === "type" && (
        <>
          <h2 className="text-lg font-bold text-ink">New session</h2>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setStep("schema")}
              className="rounded-xl border border-border bg-bg px-4 py-4 text-left"
            >
              <p className="font-semibold text-ink">Workout</p>
              <p className="text-sm text-ink-muted">Run one of your schemas</p>
            </button>
            <button
              type="button"
              onClick={() => navigate("/cardio/running")}
              className="rounded-xl border border-border bg-bg px-4 py-4 text-left"
            >
              <p className="font-semibold text-ink">Running</p>
              <p className="text-sm text-ink-muted">Track distance, pace, and calories with GPS</p>
            </button>
            <button
              type="button"
              onClick={() => navigate("/cardio/cycling")}
              className="rounded-xl border border-border bg-bg px-4 py-4 text-left"
            >
              <p className="font-semibold text-ink">Cycling</p>
              <p className="text-sm text-ink-muted">Track distance, speed, and calories with GPS</p>
            </button>
          </div>
        </>
      )}

      {step === "schema" && (
        <>
          <button type="button" onClick={() => setStep("type")} className="text-sm text-ink-muted">
            ← Back
          </button>
          <h2 className="mt-2 text-lg font-bold text-ink">Pick a schema</h2>
          <div className="mt-4 flex max-h-72 flex-col gap-2 overflow-y-auto">
            {schemas?.length === 0 && (
              <p className="text-ink-muted">
                No schemas yet.{" "}
                <Link to="/workouts/new" className="text-accent" onClick={onClose}>
                  Build one
                </Link>
                .
              </p>
            )}
            {schemas?.map((schema) => (
              <button
                key={schema.id}
                type="button"
                onClick={() => pickSchema(schema.id)}
                disabled={startSession.isPending}
                className="rounded-xl border border-border bg-bg px-4 py-3 text-left disabled:opacity-50"
              >
                <p className="font-medium text-ink">{schema.name}</p>
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </>
      )}
    </BottomSheet>
  );
}

export function WorkoutsPage() {
  const { data: schemas, isLoading } = useSchemas();
  const { data: sessions } = useSessions();
  const { data: todaysWorkout } = useTodaysWorkout();
  const finishedSessions = (sessions ?? []).filter((s) => s.finishedAt);
  const [chooserOpen, setChooserOpen] = useState(false);
  const startSession = useStartSession();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-between">
        <Link to="/programs" className="text-sm font-semibold text-accent">
          Programs
        </Link>
        <ThemeToggle />
      </div>

      <h1 className="mt-4 text-2xl font-bold text-ink">Your workouts</h1>

      {todaysWorkout && (
        <button
          type="button"
          onClick={async () => {
            const session = await startSession.mutateAsync(todaysWorkout.schemaId);
            navigate(`/sessions/${session.id}`);
          }}
          className="mt-4 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-4 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Today's workout</p>
          <p className="mt-1 text-lg font-bold text-ink">{todaysWorkout.schemaName}</p>
        </button>
      )}

      <button
        type="button"
        onClick={() => setChooserOpen(true)}
        className="mt-4 rounded-xl bg-accent px-4 py-3 text-center font-semibold text-white"
      >
        + Start session
      </button>

      <div className="mt-6 flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Schemas</h2>
        {isLoading && <p className="text-ink-muted">Loading…</p>}
        {!isLoading && schemas?.length === 0 && (
          <p className="text-ink-muted">No schemas yet. Build one to start training.</p>
        )}
        {schemas?.map((schema) => (
          <Link
            key={schema.id}
            to={`/workouts/${schema.id}/edit`}
            className="rounded-xl border border-border bg-surface px-4 py-4"
          >
            <p className="font-medium text-ink">{schema.name}</p>
            {schema.description && <p className="text-sm text-ink-muted">{schema.description}</p>}
          </Link>
        ))}
      </div>

      <Link to="/workouts/new" className="mt-4 rounded-xl border border-border px-4 py-3 text-center font-semibold text-ink">
        + New schema
      </Link>

      {finishedSessions.length > 0 && (
        <div className="mt-8 flex flex-1 flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">History</h2>
          {finishedSessions.map((s) => (
            <Link
              key={s.id}
              to={`/sessions/${s.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div>
                <p className="font-medium text-ink">{s.schemaName}</p>
                <p className="text-sm text-ink-muted">{new Date(s.startedAt).toLocaleDateString()}</p>
              </div>
              {s.progressSummary && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE_CLASS[s.progressSummary.sessionBadge]}`}>
                  {BADGE_LABEL[s.progressSummary.sessionBadge]}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {chooserOpen && <StartSessionSheet onClose={() => setChooserOpen(false)} />}
    </div>
  );
}
