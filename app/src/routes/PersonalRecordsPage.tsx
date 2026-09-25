import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useExerciseHistory, usePersonalRecords } from "../api/hooks/useProgress";
import { LineChart } from "../components/LineChart";
import { useUnits } from "../lib/useUnits";

function ExerciseHistoryChart({ exerciseId, onClose }: { exerciseId: number; onClose: () => void }) {
  const { data: history } = useExerciseHistory(exerciseId);
  const { formatWeight, weightLabel } = useUnits();

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Weight progression</p>
        <button type="button" onClick={onClose} className="text-sm text-ink-muted">
          Close
        </button>
      </div>
      {history && history.length > 0 ? (
        <div className="mt-2">
          <LineChart points={history.map((h) => h.bestWeightKg)} />
          <p className="mt-1 text-center text-sm text-ink-muted">
            {history.length} session{history.length === 1 ? "" : "s"} · latest {formatWeight(history[history.length - 1].bestWeightKg)}
            {weightLabel}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">No history yet.</p>
      )}
    </div>
  );
}

export function PersonalRecordsPage() {
  const navigate = useNavigate();
  const { data: records, isLoading } = usePersonalRecords();
  const { formatWeight, weightLabel } = useUnits();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate(-1)} className="self-start text-sm text-ink-muted">
        ← Back
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">Personal records</h1>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && <p className="text-ink-muted">Loading…</p>}
        {!isLoading && records?.length === 0 && (
          <p className="text-ink-muted">Finish a workout to start tracking PRs.</p>
        )}
        {records?.map((r) => (
          <div key={r.exerciseId} className="rounded-xl border border-border bg-surface p-4">
            <button
              type="button"
              onClick={() => setExpanded(expanded === r.exerciseId ? null : r.exerciseId)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="font-medium text-ink">{r.exerciseName}</p>
                <p className="text-sm text-ink-muted">{r.bestReps} reps</p>
              </div>
              <p className="text-xl font-bold text-accent">
                {formatWeight(r.bestWeightKg)}
                {weightLabel}
              </p>
            </button>
            {expanded === r.exerciseId && (
              <ExerciseHistoryChart exerciseId={r.exerciseId} onClose={() => setExpanded(null)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
