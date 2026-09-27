import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWeightLogs } from "../../api/hooks/useProgress";
import { useChartTheme } from "../../lib/chartColors";

function movingAverage(values: number[], windowSize: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < windowSize - 1) return null;
    const window = values.slice(i - windowSize + 1, i + 1);
    return Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) / 10;
  });
}

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WeightReport() {
  const { data: logs, isLoading } = useWeightLogs();
  const theme = useChartTheme();

  if (isLoading) return <p className="mt-6 text-center text-ink-muted">Loading…</p>;
  if (!logs?.length) return <p className="mt-6 text-center text-ink-muted">Log your weight a few times to see a trend here.</p>;

  const avg7 = movingAverage(logs.map((l) => l.weightKg), Math.min(7, logs.length));
  const data = logs.map((l, i) => ({ date: l.loggedDate, weight: l.weightKg, avg: avg7[i] }));

  return (
    <div className="mt-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Weight trend</h2>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fill: theme.axisText, fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fill: theme.axisText, fontSize: 11 }} width={40} domain={["auto", "auto"]} />
            <Tooltip
              labelFormatter={(v) => formatDateLabel(String(v))}
              contentStyle={{ background: theme.surface, border: `1px solid ${theme.grid}`, borderRadius: 12, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: theme.axisText }} />
            <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke={theme.categorical[0]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            <Line type="monotone" dataKey="avg" name="7-day average" stroke={theme.accent} strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
