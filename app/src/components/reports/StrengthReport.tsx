import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useVolumeTrend, usePersonalRecords } from "../../api/hooks/useProgress";
import { useChartTheme } from "../../lib/chartColors";

function formatWeekLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function StrengthReport() {
  const { data: trend, isLoading } = useVolumeTrend(12);
  const { data: records } = usePersonalRecords();
  const theme = useChartTheme();

  const hasVolume = trend?.some((w) => w.volumeKg > 0);

  return (
    <div className="mt-4 flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Training volume / week</h2>
        {isLoading && <p className="mt-3 text-ink-muted">Loading…</p>}
        {!isLoading && !hasVolume && (
          <p className="mt-3 text-ink-muted">Finish a few workouts to see your training volume here.</p>
        )}
        {hasVolume && (
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="weekStart" tickFormatter={formatWeekLabel} tick={{ fill: theme.axisText, fontSize: 11 }} />
                <YAxis tick={{ fill: theme.axisText, fontSize: 11 }} width={48} unit="kg" />
                <Tooltip
                  labelFormatter={(v) => formatWeekLabel(String(v))}
                  contentStyle={{ background: theme.surface, border: `1px solid ${theme.grid}`, borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="volumeKg" name="Volume (kg)" fill={theme.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">Personal records</p>
            <p className="text-sm text-ink-muted">{records?.length ?? 0} exercises with a tracked PR</p>
          </div>
          <Link to="/progress/prs" className="text-sm font-semibold text-accent">
            View all ›
          </Link>
        </div>
      </div>
    </div>
  );
}
