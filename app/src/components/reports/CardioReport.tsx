import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCardioTrend } from "../../api/hooks/useCardioSessions";
import { useChartTheme } from "../../lib/chartColors";
import { useAuth } from "../../context/AuthContext";

function formatWeekLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Distance (km) and duration (min) are different scales, so — same rule as
// the nutrition report — this is two charts on a shared x-axis, not one
// dual-axis chart.
export function CardioReport() {
  const { user } = useAuth();
  const { data: trend, isLoading } = useCardioTrend(user?.isPro ? 52 : 12);
  const theme = useChartTheme();

  const data = trend?.map((w) => ({
    weekStart: w.weekStart,
    runningKm: Math.round((w.running.distanceM / 1000) * 10) / 10,
    cyclingKm: Math.round((w.cycling.distanceM / 1000) * 10) / 10,
    runningMin: Math.round(w.running.durationS / 60),
    cyclingMin: Math.round(w.cycling.durationS / 60),
  }));

  const hasData = data?.some((w) => w.runningKm > 0 || w.cyclingKm > 0);

  if (isLoading) return <p className="mt-6 text-center text-ink-muted">Loading…</p>;
  if (!hasData) return <p className="mt-6 text-center text-ink-muted">Log a run or ride to see your cardio trend here.</p>;

  return (
    <div className="mt-4 flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Distance / week</h2>
        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="weekStart" tickFormatter={formatWeekLabel} tick={{ fill: theme.axisText, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.axisText, fontSize: 11 }} width={40} unit="km" />
              <Tooltip
                labelFormatter={(v) => formatWeekLabel(String(v))}
                contentStyle={{ background: theme.surface, border: `1px solid ${theme.grid}`, borderRadius: 12, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: theme.axisText }} />
              <Bar dataKey="runningKm" name="Running" fill={theme.categorical[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="cyclingKm" name="Cycling" fill={theme.categorical[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Duration / week</h2>
        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="weekStart" tickFormatter={formatWeekLabel} tick={{ fill: theme.axisText, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.axisText, fontSize: 11 }} width={40} unit="m" />
              <Tooltip
                labelFormatter={(v) => formatWeekLabel(String(v))}
                contentStyle={{ background: theme.surface, border: `1px solid ${theme.grid}`, borderRadius: 12, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: theme.axisText }} />
              <Bar dataKey="runningMin" name="Running" fill={theme.categorical[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="cyclingMin" name="Cycling" fill={theme.categorical[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!user?.isPro && (
        <Link to="/profile/plan" className="text-center text-sm text-ink-muted">
          ✨ Pro shows your full history, not just 12 weeks
        </Link>
      )}
    </div>
  );
}
