import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNutritionTrend } from "../../api/hooks/useFoodLogs";
import { useChartTheme } from "../../lib/chartColors";
import { useAuth } from "../../context/AuthContext";

function formatWeekLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Calories and macro grams are different scales, so this is deliberately two
// charts sharing one x-axis rather than a dual-axis chart on one.
export function NutritionReport() {
  const { user } = useAuth();
  const { data: trend, isLoading } = useNutritionTrend(user?.isPro ? 52 : 8);
  const theme = useChartTheme();

  if (isLoading) return <p className="mt-6 text-center text-ink-muted">Loading…</p>;
  if (!trend?.some((w) => w.avgCalories > 0)) {
    return <p className="mt-6 text-center text-ink-muted">Log some food to see your nutrition trend here.</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Avg. calories / day, per week</h2>
        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="weekStart" tickFormatter={formatWeekLabel} tick={{ fill: theme.axisText, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.axisText, fontSize: 11 }} width={40} />
              <Tooltip
                labelFormatter={(v) => formatWeekLabel(String(v))}
                contentStyle={{ background: theme.surface, border: `1px solid ${theme.grid}`, borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="avgCalories" name="kcal" fill={theme.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Avg. macros / day, per week</h2>
        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="weekStart" tickFormatter={formatWeekLabel} tick={{ fill: theme.axisText, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.axisText, fontSize: 11 }} width={40} unit="g" />
              <Tooltip
                labelFormatter={(v) => formatWeekLabel(String(v))}
                contentStyle={{ background: theme.surface, border: `1px solid ${theme.grid}`, borderRadius: 12, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: theme.axisText }} />
              <Line type="monotone" dataKey="avgProtein" name="Protein" stroke={theme.categorical[0]} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="avgCarbs" name="Carbs" stroke={theme.categorical[1]} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="avgFat" name="Fat" stroke={theme.categorical[2]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!user?.isPro && (
        <Link to="/profile/plan" className="text-center text-sm text-ink-muted">
          ✨ Pro shows your full history, not just 8 weeks
        </Link>
      )}
    </div>
  );
}
