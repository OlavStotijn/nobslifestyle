import { Link } from "react-router-dom";
import { useSchemas } from "../api/hooks/useWorkouts";
import { useSessions, type Badge } from "../api/hooks/useSessions";
import { ThemeToggle } from "../components/ThemeToggle";

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

export function WorkoutsPage() {
  const { data: schemas, isLoading } = useSchemas();
  const { data: sessions } = useSessions();
  const finishedSessions = (sessions ?? []).filter((s) => s.finishedAt);

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-end">
        <ThemeToggle />
      </div>

      <h1 className="mt-4 text-2xl font-bold text-ink">Your workouts</h1>

      <div className="mt-6 flex flex-col gap-3">
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

      <Link to="/workouts/new" className="mt-4 rounded-xl bg-accent px-4 py-3 text-center font-semibold text-white">
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
    </div>
  );
}
