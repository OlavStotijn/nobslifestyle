import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useCreateSchema } from "../api/hooks/useWorkouts";

export function NewSchemaPage() {
  const navigate = useNavigate();
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
      </div>
    </div>
  );
}
