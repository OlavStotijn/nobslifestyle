import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  useApplyWeight,
  useAddSet,
  useFinishSession,
  useSaveSessionAsSchema,
  useSession,
  type SessionExercise,
} from "../api/hooks/useSessions";
import { WeightStepper } from "../components/WeightStepper";
import { BottomSheet } from "../components/BottomSheet";
import { ProgressBadge } from "../components/ProgressBadge";
import { PostComposer } from "../components/PostComposer";
import { RestTimer } from "../components/RestTimer";
import { useUnits } from "../lib/useUnits";
import { useAuth } from "../context/AuthContext";

function lastLoggedWeight(exercise: SessionExercise): number {
  if (exercise.sets.length === 0) return exercise.targetWeightKg;
  return exercise.sets[exercise.sets.length - 1].weightKg;
}

function ExerciseRunner({
  sessionId,
  exercise,
  onComplete,
}: {
  sessionId: number;
  exercise: SessionExercise;
  onComplete: () => void;
}) {
  const addSet = useAddSet(sessionId);
  const applyWeight = useApplyWeight(sessionId);
  const { formatWeight, weightLabel } = useUnits();
  const { user } = useAuth();
  const [reps, setReps] = useState(exercise.targetRepsMin);
  const [weight, setWeight] = useState(lastLoggedWeight(exercise));
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [restKey, setRestKey] = useState(0);
  const [resting, setResting] = useState(false);

  const alreadyResolved = exercise.sets.some((s) => s.weightChangeApplied !== "none");
  const setsLogged = exercise.sets.length;

  async function logSet() {
    await addSet.mutateAsync({ sessionExerciseId: exercise.id, reps, weightKg: weight });
    const justFinishedExercise = setsLogged + 1 >= exercise.targetSets;
    if (!justFinishedExercise) {
      setRestKey((k) => k + 1);
      setResting(true);
    }
    if (!alreadyResolved && weight !== exercise.targetWeightKg) {
      setShowWeightPrompt(true);
    } else if (justFinishedExercise) {
      onComplete();
    }
  }

  async function resolveWeightPrompt(permanent: boolean) {
    setShowWeightPrompt(false);
    await applyWeight.mutateAsync({ sessionExerciseId: exercise.id, permanent });
    if (setsLogged + 1 >= exercise.targetSets) onComplete();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <h2 className="text-xl font-bold text-ink">{exercise.exerciseName}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Target: {exercise.targetSets} × {exercise.targetRepsMin}-{exercise.targetRepsMax} @{" "}
          {formatWeight(exercise.targetWeightKg)}
          {weightLabel}
        </p>
        <p className="mt-1 text-sm text-accent">
          Set {Math.min(setsLogged + 1, exercise.targetSets)} of {exercise.targetSets}
        </p>
      </div>

      <div className="mt-6">
        <WeightStepper valueKg={weight} onChangeKg={setWeight} />
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setReps((r) => Math.max(1, r - 1))}
          className="h-10 w-10 rounded-full border border-border text-lg font-bold text-ink"
        >
          −
        </button>
        <div className="w-20 text-center">
          <p className="text-2xl font-bold text-ink">{reps}</p>
          <p className="text-xs text-ink-muted">reps</p>
        </div>
        <button
          type="button"
          onClick={() => setReps((r) => r + 1)}
          className="h-10 w-10 rounded-full border border-border text-lg font-bold text-ink"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={logSet}
        disabled={addSet.isPending}
        className="mt-8 rounded-xl bg-accent px-4 py-4 text-center font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {addSet.isPending ? "Logging…" : "Log set"}
      </button>

      {resting && (
        <div className="mt-4">
          <RestTimer key={restKey} seconds={user?.restTimerSeconds ?? 90} onDone={() => setResting(false)} />
        </div>
      )}

      {exercise.sets.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          {exercise.sets.map((s) => (
            <p key={s.id} className="text-sm text-ink-muted">
              Set {s.setNumber}: {s.reps} reps @ {formatWeight(s.weightKg)}
              {weightLabel}
            </p>
          ))}
        </div>
      )}

      <BottomSheet open={showWeightPrompt} onClose={() => setShowWeightPrompt(false)}>
        <h3 className="text-lg font-bold text-ink">
          Use {formatWeight(weight)}
          {weightLabel} going forward?
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          That's different from this schema's target of {formatWeight(exercise.targetWeightKg)}
          {weightLabel}.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => resolveWeightPrompt(true)}
            className="rounded-xl bg-accent px-4 py-3 font-semibold text-white"
          >
            Always — update the schema
          </button>
          <button
            type="button"
            onClick={() => resolveWeightPrompt(false)}
            className="rounded-xl border border-border px-4 py-3 font-semibold text-ink"
          >
            Just this session
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

function FinishedSummary({ sessionId }: { sessionId: number }) {
  const { data: session } = useSession(sessionId);
  const saveAsSchema = useSaveSessionAsSchema(sessionId);
  const [savedSchemaId, setSavedSchemaId] = useState<number | null>(null);

  if (!session) return null;

  async function handleSaveAsSchema() {
    const name = `${session!.schemaName} (updated)`;
    const res = await saveAsSchema.mutateAsync(name);
    setSavedSchemaId(res.schemaId);
  }

  return (
    <div className="flex flex-1 flex-col justify-center text-center">
      <h1 className="text-2xl font-bold text-ink">Workout complete</h1>
      {session.rating && <p className="mt-2 text-4xl">{"★".repeat(session.rating)}{"☆".repeat(5 - session.rating)}</p>}
      {session.notes && <p className="mt-3 text-ink-muted">{session.notes}</p>}

      {session.progressSummary && session.progressSummary.perExercise.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 text-left">
          {session.progressSummary.perExercise.map((info) => (
            <ProgressBadge key={info.exerciseId} info={info} />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {savedSchemaId ? (
          <Link
            to={`/workouts/${savedSchemaId}/edit`}
            className="rounded-xl border border-border px-4 py-3 font-semibold text-ink"
          >
            View new schema →
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSaveAsSchema}
            disabled={saveAsSchema.isPending}
            className="rounded-xl border border-border px-4 py-3 font-semibold text-ink transition-opacity disabled:opacity-50"
          >
            {saveAsSchema.isPending ? "Saving…" : "Save as new schema"}
          </button>
        )}
        <PostComposer sessionId={sessionId} />
        <Link to={`/sessions/${sessionId}/share`} className="rounded-xl border border-border px-4 py-3 font-semibold text-ink">
          Share photo
        </Link>
        <Link to="/workouts" className="rounded-xl bg-accent px-4 py-3 font-semibold text-white">
          Done
        </Link>
      </div>
    </div>
  );
}

function FinishStep({ sessionId, onBack }: { sessionId: number; onBack: () => void }) {
  const finishSession = useFinishSession(sessionId);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");

  async function finish() {
    await finishSession.mutateAsync({ rating: rating || undefined, notes: notes || undefined });
  }

  return (
    <div className="flex flex-1 flex-col justify-center">
      <button type="button" onClick={onBack} className="self-start text-sm text-ink-muted">
        ← Back to workout
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">How'd it go?</h1>

      <div className="mt-4 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className="text-4xl">
            {n <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={3}
        className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
      />

      <button
        type="button"
        onClick={finish}
        disabled={finishSession.isPending}
        className="mt-6 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {finishSession.isPending ? "Finishing…" : "Finish workout"}
      </button>
    </div>
  );
}

export function SessionRunnerPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession(sessionId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  if (isLoading || !session) {
    return <div className="flex min-h-full items-center justify-center bg-bg text-ink-muted">Loading…</div>;
  }

  if (session.finishedAt) {
    return (
      <div className="flex min-h-full flex-col bg-bg px-6 py-8">
        <FinishedSummary sessionId={sessionId} />
      </div>
    );
  }

  if (finishing) {
    return (
      <div className="flex min-h-full flex-col bg-bg px-6 py-8">
        <FinishStep sessionId={sessionId} onBack={() => setFinishing(false)} />
      </div>
    );
  }

  const activeExercise = session.exercises[activeIndex];

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/workouts")} className="self-start text-sm text-ink-muted">
        ← Exit
      </button>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {session.exercises.map((ex, i) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              i === activeIndex ? "bg-accent text-white" : "bg-surface-2 text-ink-muted"
            }`}
          >
            {ex.exerciseName} {ex.sets.length >= ex.targetSets ? "✓" : ""}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        {activeExercise && (
          <ExerciseRunner
            key={activeExercise.id}
            sessionId={sessionId}
            exercise={activeExercise}
            onComplete={() => {
              if (activeIndex < session.exercises.length - 1) setActiveIndex(activeIndex + 1);
            }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setFinishing(true)}
        className="mt-6 rounded-xl border border-border px-4 py-3 text-center font-semibold text-ink"
      >
        Finish workout
      </button>
    </div>
  );
}
