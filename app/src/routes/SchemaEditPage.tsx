import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useAddSchemaExercise,
  useDeleteSchemaExercise,
  useExerciseSearch,
  useExercisesByCategory,
  useSchema,
  useUpdateSchemaExercise,
  useUpdateSchemaVisibility,
  type Exercise,
  type SchemaExercise,
} from "../api/hooks/useWorkouts";
import { useStartSession } from "../api/hooks/useSessions";
import { ApiError } from "../api/client";
import { BottomSheet } from "../components/BottomSheet";
import { useDebounced } from "../hooks/useDebounced";
import { CATEGORY_LABELS, CATEGORY_ORDER, MuscleGroupIcon, normalizeCategory } from "../components/MuscleGroupIcon";
import { MuscleBodyDiagram } from "../components/MuscleBodyDiagram";

function ExerciseRow({ ex, onPick }: { ex: Exercise; onPick: (exercise: Exercise) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(ex)}
      className="flex items-center justify-between rounded-xl border border-border bg-bg px-4 py-3 text-left"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft p-1.5 text-accent">
          <MuscleGroupIcon category={ex.category} className="block h-full w-full" />
        </span>
        <span className="font-medium text-ink">{ex.name}</span>
      </span>
      {ex.category && <span className="text-sm text-ink-muted">{CATEGORY_LABELS[normalizeCategory(ex.category)]}</span>}
    </button>
  );
}

type PickerMode = "search" | "categories" | "muscle";

function SearchPane({ onPick }: { onPick: (exercise: Exercise) => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);
  const { data: results, isFetching } = useExerciseSearch(debouncedQuery);

  return (
    <>
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
          <ExerciseRow key={ex.id} ex={ex} onPick={onPick} />
        ))}
      </div>
    </>
  );
}

function CategoryExerciseList({ category, onBack, onPick }: { category: string; onBack: () => void; onPick: (exercise: Exercise) => void }) {
  const { data: results, isFetching } = useExercisesByCategory(category);
  return (
    <>
      <button type="button" onClick={onBack} className="mt-3 self-start text-sm text-ink-muted">
        ← {CATEGORY_LABELS[normalizeCategory(category)]}
      </button>
      <div className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {isFetching && <p className="text-ink-muted">Loading…</p>}
        {results?.length === 0 && <p className="text-ink-muted">No exercises in this category yet.</p>}
        {results?.map((ex) => (
          <ExerciseRow key={ex.id} ex={ex} onPick={onPick} />
        ))}
      </div>
    </>
  );
}

function CategoriesPane({ onPick }: { onPick: (exercise: Exercise) => void }) {
  const [category, setCategory] = useState<string | null>(null);

  if (category) {
    return <CategoryExerciseList category={category} onBack={() => setCategory(null)} onPick={onPick} />;
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {CATEGORY_ORDER.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCategory(c)}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-bg px-2 py-3 text-center"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft p-2 text-accent">
            <MuscleGroupIcon category={c} className="block h-full w-full" />
          </span>
          <span className="text-xs font-medium text-ink">{CATEGORY_LABELS[c]}</span>
        </button>
      ))}
    </div>
  );
}

function MusclePane({ onPick }: { onPick: (exercise: Exercise) => void }) {
  const [category, setCategory] = useState<string | null>(null);

  return (
    <div className="mt-3">
      <div className="h-64">
        <MuscleBodyDiagram selected={category} onSelect={(c) => setCategory(c)} />
      </div>
      {category ? (
        <CategoryExerciseList category={category} onBack={() => setCategory(null)} onPick={onPick} />
      ) : (
        <p className="mt-2 text-center text-sm text-ink-muted">Tap a muscle group to see exercises for it.</p>
      )}
    </div>
  );
}

function ExercisePicker({ onPick, onClose }: { onPick: (exercise: Exercise) => void; onClose: () => void }) {
  const [mode, setMode] = useState<PickerMode>("search");
  const modes: { key: PickerMode; label: string }[] = [
    { key: "search", label: "Search" },
    { key: "categories", label: "Categories" },
    { key: "muscle", label: "Muscle map" },
  ];

  return (
    <BottomSheet open onClose={onClose}>
      <h2 className="text-lg font-bold text-ink">Add an exercise</h2>

      <div className="mt-3 flex gap-2 rounded-xl bg-bg p-1">
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === m.key ? "bg-accent text-white" : "text-ink-muted"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "search" && <SearchPane onPick={onPick} />}
      {mode === "categories" && <CategoriesPane onPick={onPick} />}
      {mode === "muscle" && <MusclePane onPick={onPick} />}
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
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft p-1.5 text-accent">
            <MuscleGroupIcon category={row.category} className="block h-full w-full" />
          </span>
          <p className="font-medium text-ink">{row.exerciseName}</p>
        </span>
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
  const updateVisibility = useUpdateSchemaVisibility(schemaId);
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

  const byCategory = new Map<string, SchemaExercise[]>();
  for (const row of schema.exercises) {
    const key = normalizeCategory(row.category);
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(row);
  }
  const groupedExercises = CATEGORY_ORDER.filter((c) => byCategory.has(c)).map(
    (c) => [c, byCategory.get(c)!] as [string, SchemaExercise[]]
  );

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/workouts")} className="self-start text-sm text-ink-muted">
        ← Workouts
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">{schema.name}</h1>

      <button
        type="button"
        onClick={() => updateVisibility.mutate(schema.visibility === "private" ? "friends" : "private")}
        disabled={updateVisibility.isPending}
        className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left disabled:opacity-50"
      >
        <span className="text-sm text-ink">
          {schema.visibility === "friends" ? "Shared with friends" : "Private"}
        </span>
        <span
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
            schema.visibility === "friends" ? "bg-accent" : "bg-surface-2"
          }`}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: schema.visibility === "friends" ? "translateX(1.125rem)" : "translateX(0.125rem)" }}
          />
        </span>
      </button>

      <div className="mt-6 flex flex-1 flex-col gap-5">
        {schema.exercises.length === 0 && <p className="text-ink-muted">Add exercises to build your schema.</p>}
        {groupedExercises.map(([category, rows]) => (
          <div key={category} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-ink-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <MuscleGroupIcon category={category} className="block h-full w-full" />
              </span>
              <h2 className="text-xs font-semibold uppercase tracking-wide">{CATEGORY_LABELS[category]}</h2>
            </div>
            {rows.map((row) => (
              <SchemaExerciseRow
                key={row.id}
                row={row}
                onUpdate={(patch) => updateExercise.mutate({ rowId: row.id, ...patch })}
                onDelete={() => deleteExercise.mutate(row.id)}
              />
            ))}
          </div>
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
