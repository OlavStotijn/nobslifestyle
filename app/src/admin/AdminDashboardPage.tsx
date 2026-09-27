import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminMetrics } from "../api/hooks/useAdmin";
import { useChartTheme } from "../lib/chartColors";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-3xl font-bold text-ink">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}

function formatDay(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdminDashboardPage() {
  const { data, isLoading } = useAdminMetrics();
  const theme = useChartTheme();

  if (isLoading) return <p className="text-ink-muted">Loading…</p>;
  if (!data) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total users" value={data.totalUsers} />
        <StatTile label="Active (24h)" value={data.active24h} />
        <StatTile label="Active (7d)" value={data.active7d} />
        <StatTile label="Active (30d)" value={data.active30d} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Signups — last 30 days</h2>
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.signupsPerDay} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fill: theme.axisText, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.axisText, fontSize: 11 }} width={32} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v) => formatDay(String(v))}
                contentStyle={{ background: theme.surface, border: `1px solid ${theme.grid}`, borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="count" name="Signups" fill={theme.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
