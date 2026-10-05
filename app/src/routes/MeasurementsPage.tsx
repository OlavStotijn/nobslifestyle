import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBodyMeasurements, useCreateBodyMeasurement, useDeleteBodyMeasurement, type BodyMeasurement } from "../api/hooks/useBodyMeasurements";
import { LineChart } from "../components/LineChart";
import { ApiError } from "../api/client";

type MetricKey = "waistCm" | "chestCm" | "hipsCm" | "armsCm" | "thighsCm";

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "waistCm", label: "Waist" },
  { key: "chestCm", label: "Chest" },
  { key: "hipsCm", label: "Hips" },
  { key: "armsCm", label: "Arms" },
  { key: "thighsCm", label: "Thighs" },
];

function LogForm() {
  const [values, setValues] = useState<Record<MetricKey, string>>({ waistCm: "", chestCm: "", hipsCm: "", armsCm: "", thighsCm: "" });
  const [error, setError] = useState<string | null>(null);
  const create = useCreateBodyMeasurement();

  async function submit() {
    setError(null);
    const input = Object.fromEntries(
      Object.entries(values)
        .filter(([, v]) => v.trim() !== "")
        .map(([k, v]) => [k, Number(v)])
    );
    if (Object.keys(input).length === 0) {
      setError("Enter at least one measurement.");
      return;
    }
    try {
      await create.mutateAsync(input);
      setValues({ waistCm: "", chestCm: "", hipsCm: "", armsCm: "", thighsCm: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-ink-muted">Log today (cm) — fill in any you want</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {METRICS.map((m) => (
          <input
            key={m.key}
            type="number"
            inputMode="decimal"
            value={values[m.key]}
            onChange={(e) => setValues((prev) => ({ ...prev, [m.key]: e.target.value }))}
            placeholder={m.label}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
          />
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={create.isPending}
        className="mt-3 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {create.isPending ? "Saving…" : "Log measurements"}
      </button>
    </div>
  );
}

function HistoryList({ measurements }: { measurements: BodyMeasurement[] }) {
  const deleteMeasurement = useDeleteBodyMeasurement();
  const recent = [...measurements].reverse().slice(0, 10);

  return (
    <div className="mt-4 flex flex-col gap-2">
      {recent.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <div>
            <p className="text-ink">{new Date(m.loggedDate).toLocaleDateString()}</p>
            <p className="text-ink-muted">
              {METRICS.filter((metric) => m[metric.key] != null)
                .map((metric) => `${metric.label} ${m[metric.key]}cm`)
                .join(" · ")}
            </p>
          </div>
          <button type="button" onClick={() => deleteMeasurement.mutate(m.id)} className="text-ink-muted" aria-label="Delete">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function MeasurementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: measurements } = useBodyMeasurements();
  const [metric, setMetric] = useState<MetricKey>("waistCm");

  if (user?.isPro !== true) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-bg px-6 py-8 text-center">
        <p className="text-2xl">✨</p>
        <h1 className="text-lg font-bold text-ink">Body measurements are a Pro feature</h1>
        <p className="text-sm text-ink-muted">Track waist, chest, hips, arms, and thighs over time — not just weight.</p>
        <Link to="/profile/plan" className="mt-2 rounded-xl bg-accent px-4 py-3 font-semibold text-white">
          See Pro features
        </Link>
        <button type="button" onClick={() => navigate("/profile")} className="mt-2 text-sm text-ink-muted">
          ← Back
        </button>
      </div>
    );
  }

  const points = (measurements ?? []).map((m) => m[metric]).filter((v): v is number => v != null);

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/profile")} className="self-start text-sm text-ink-muted">
        ← Back
      </button>
      <h1 className="mt-4 text-2xl font-bold text-ink">Measurements</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              metric === m.key ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
        {points.length >= 2 ? (
          <LineChart points={points} />
        ) : (
          <p className="text-center text-sm text-ink-muted">Log {METRICS.find((m) => m.key === metric)?.label.toLowerCase()} a couple times to see a trend.</p>
        )}
      </div>

      <div className="mt-6">
        <LogForm />
      </div>

      {measurements && measurements.length > 0 && <HistoryList measurements={measurements} />}
    </div>
  );
}
