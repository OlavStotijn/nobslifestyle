import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSchemas } from "../api/hooks/useWorkouts";
import {
  useActivateProgram,
  useCreateProgram,
  useDeactivateProgram,
  useDeleteProgram,
  usePrograms,
  useSetProgramDays,
  type Program,
} from "../api/hooks/usePrograms";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ProgramEditor({ program }: { program: Program }) {
  const { data: schemas } = useSchemas();
  const { user } = useAuth();
  const setDays = useSetProgramDays(program.id);
  const activate = useActivateProgram();
  const deactivate = useDeactivateProgram();
  const deleteProgram = useDeleteProgram();
  const navigate = useNavigate();

  const dayMap = new Map(program.days.map((d) => [d.weekday, d.schemaId]));
  const isActive = user?.activeProgramId === program.id;

  function setDay(weekday: number, schemaId: number | null) {
    const days = WEEKDAY_LABELS.map((_, i) => ({ weekday: i, schemaId: i === weekday ? schemaId : dayMap.get(i) ?? null }));
    setDays.mutate(days);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">{program.name}</h2>
        {isActive ? (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">Active</span>
        ) : (
          <button type="button" onClick={() => activate.mutate(program.id)} className="text-sm font-semibold text-accent">
            Set active
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-sm text-ink-muted">{label}</span>
            <select
              value={dayMap.get(i) ?? ""}
              onChange={(e) => setDay(i, e.target.value ? Number(e.target.value) : null)}
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Rest day</option>
              {schemas?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        {isActive && (
          <button type="button" onClick={() => deactivate.mutate()} className="text-sm text-ink-muted">
            Deactivate
          </button>
        )}
        <button
          type="button"
          onClick={() => deleteProgram.mutate(program.id)}
          className="text-sm text-red-500"
        >
          Delete
        </button>
        <button type="button" onClick={() => navigate("/workouts")} className="ml-auto text-sm font-semibold text-accent">
          Done
        </button>
      </div>
    </div>
  );
}

export function ProgramsPage() {
  const navigate = useNavigate();
  const { data: programs, isLoading } = usePrograms();
  const createProgram = useCreateProgram();
  const [name, setName] = useState("");

  async function create() {
    if (!name.trim()) return;
    await createProgram.mutateAsync(name.trim());
    setName("");
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate(-1)} className="self-start text-sm text-ink-muted">
        ← Back
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">Programs</h1>
      <p className="text-sm text-ink-muted">Assign a schema to each weekday so "today's workout" picks itself.</p>

      <div className="mt-6 flex flex-col gap-4">
        {isLoading && <p className="text-ink-muted">Loading…</p>}
        {programs?.map((p) => (
          <ProgramEditor key={p.id} program={p} />
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New program name"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={create}
          disabled={createProgram.isPending || !name.trim()}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </div>
  );
}
