import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { useCreateSchema, useGenerateWorkout } from "../api/hooks/useWorkouts";
import { useAuth } from "../context/AuthContext";

type Mode = "manual" | "ai";

function AiGenerateForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [experience, setExperience] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [equipment, setEquipment] = useState("");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const generate = useGenerateWorkout();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const schemaId = await generate.mutateAsync({ goal, experience, equipment, focus: focus || undefined });
      navigate(`/workouts/${schemaId}/edit`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start text-sm text-ink-muted">
        ← Back
      </button>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">Goal</span>
        <input
          required
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Build strength, lose fat, general fitness…"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">Experience</span>
        <select
          value={experience}
          onChange={(e) => setExperience(e.target.value as typeof experience)}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">Equipment available</span>
        <input
          required
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          placeholder="Full gym, dumbbells only, bodyweight only…"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">Focus (optional)</span>
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Upper body, legs, full body…"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={generate.isPending}
        className="rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {generate.isPending ? "Generating…" : "Generate workout"}
      </button>
    </form>
  );
}

export function NewSchemaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("manual");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createMutation = useCreateSchema();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const schema = await createMutation.mutateAsync({ name });
      navigate(`/workouts/${schema.id}/edit`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/workouts")} className="self-start text-sm text-ink-muted">
        ← Cancel
      </button>

      <div className="flex flex-1 flex-col justify-center">
        {mode === "manual" ? (
          <>
            <h1 className="text-2xl font-bold text-ink">Name your schema</h1>
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
              <input
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Push Day A"
                className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating…" : "Continue"}
              </button>
            </form>

            {user?.isPro ? (
              <button type="button" onClick={() => setMode("ai")} className="mt-4 text-sm font-medium text-accent">
                ✨ Or generate one with AI
              </button>
            ) : (
              <Link to="/profile/plan" className="mt-4 text-sm font-medium text-ink-muted">
                ✨ Generate one with AI — Pro feature
              </Link>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-ink">Generate a workout</h1>
            <AiGenerateForm onBack={() => setMode("manual")} />
          </>
        )}
      </div>
    </div>
  );
}
