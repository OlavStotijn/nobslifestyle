import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useAddSchemaExercise,
  useDeleteSchemaExercise,
  useExerciseSearch,
  useSchema,
  useUpdateSchemaExercise,
  type Exercise,
  type SchemaExercise,
} from "../api/hooks/useWorkouts";
import { useStartSession } from "../api/hooks/useSessions";
import { ApiError } from "../api/client";
import { BottomSheet } from "../components/BottomSheet";
import { useDebounced } from "../hooks/useDebounced";

function ExercisePicker({ onPick, onClose }: { onPick: (exercise: Exercise) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);
  const { data: results, isFetching } = useExerciseSearch(debouncedQuery);

  return (
    <BottomSheet open onClose={onClose}>
      <h2 className="text-lg font-bold text-ink">Add an exercise</h2>
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises…"
        className="mt-3 w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-accent"
      />
      <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {isFetching && <p className="text-ink-muted">Searching…</p>}
        {results?.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => onPick(ex)}
            className="flex items-center justify-between rounded-xl border border-border bg-bg px-4 py-3 text-left"
          >
            <span className="font-medium text-ink">{ex.name}</span>
            {ex.category && <span className="text-sm text-ink-muted">{ex.category}</span>}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

function SchemaExerciseRow({
  row,
  onUpdate,
  onDelete,
}: {
  row: SchemaExercise;
  onUpdate: (patch: Partial<Pick<SchemaExercise, "targetSets" | "targetRepsMin" | "targetRepsMax" | "targetWeightKg">>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink">{row.exerciseName}</p>
        <button type="button" onClick={onDelete} className="text-sm text-ink-muted hover:text-red-500">
          Remove
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Sets</span>
          <input
            type="number"
            defaultValue={row.targetSets}
            onBlur={(e) => onUpdate({ targetSets: Number(e.target.value) || row.targetSets })}
            className="rounded-lg border border-border bg-bg px-2 py-2 text-center text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Reps min</span>
          <input
            type="number"
            defaultValue={row.targetRepsMin}
            onBlur={(e) => onUpdate({ targetRepsMin: Number(e.target.value) || row.targetRepsMin })}
            className="rounded-lg border border-border bg-bg px-2 py-2 text-center text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Reps max</span>
          <input
            type="number"
            defaultValue={row.targetRepsMax}
            onBlur={(e) => onUpdate({ targetRepsMax: Number(e.target.value) || row.targetRepsMax })}
            className="rounded-lg border border-border bg-bg px-2 py-2 text-center text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Weight kg</span>
          <input
            type="number"
            step="0.5"
            defaultValue={row.targetWeightKg}
            onBlur={(e) => onUpdate({ targetWeightKg: Number(e.target.value) || row.targetWeightKg })}
            className="rounded-lg border border-border bg-bg px-2 py-2 text-center text-ink outline-none focus:border-accent"
          />
        </label>
      </div>
    </div>
  );
}

export function SchemaEditPage() {
  const { id } = useParams();
  const schemaId = Number(id);
  const navigate = useNavigate();
  const { data: schema, isLoading } = useSchema(schemaId);
  const addExercise = useAddSchemaExercise(schemaId);
  const updateExercise = useUpdateSchemaExercise(schemaId);
  const deleteExercise = useDeleteSchemaExercise(schemaId);
  const startSession = useStartSession();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function pickExercise(exercise: Exercise) {
    setPickerOpen(false);
    await addExercise.mutateAsync({
      exerciseId: exercise.id,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 10,
      targetWeightKg: 20,
    });
  }

  async function handleStart() {
    setStartError(null);
    try {
      const session = await startSession.mutateAsync(schemaId);
      navigate(`/sessions/${session.id}`);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : "Couldn't start session.");
    }
  }

  if (isLoading || !schema) {
    return <div className="flex min-h-full items-center justify-center bg-bg text-ink-muted">Loading…</div>;
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/workouts")} className="self-start text-sm text-ink-muted">
        ← Workouts
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">{schema.name}</h1>

      <div className="mt-6 flex flex-1 flex-col gap-3">
        {schema.exercises.length === 0 && <p className="text-ink-muted">Add exercises to build your schema.</p>}
        {schema.exercises.map((row) => (
          <SchemaExerciseRow
            key={row.id}
            row={row}
            onUpdate={(patch) => updateExercise.mutate({ rowId: row.id, ...patch })}
            onDelete={() => deleteExercise.mutate(row.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mt-4 rounded-xl border border-border px-4 py-3 text-center font-semibold text-ink"
      >
        + Add exercise
      </button>

      {startError && <p className="mt-3 text-center text-sm text-red-500">{startError}</p>}

      <button
        type="button"
        onClick={handleStart}
        disabled={schema.exercises.length === 0 || startSession.isPending}
        className="mt-3 rounded-xl bg-accent px-4 py-3 text-center font-semibold text-white transition-opacity disabled:opacity-40"
      >
        {startSession.isPending ? "Starting…" : "Start session"}
      </button>

      {pickerOpen && <ExercisePicker onPick={pickExercise} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
