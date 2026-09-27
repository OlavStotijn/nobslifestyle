import { Link } from "react-router-dom";
import { useWeekSummary, todayLocalDate } from "../api/hooks/useFoodLogs";

function dayLetter(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
}

// Small tap-through widget on the Food tab — a week's worth of calorie bars
// vs. today's target, linking to /food/week for the day-by-day breakdown.
export function WeekOverviewWidget({ targetKcal }: { targetKcal: number }) {
  const { data } = useWeekSummary();
  if (!data) return null;

  const today = todayLocalDate();
  const maxCalories = Math.max(targetKcal, ...data.days.map((d) => d.calories), 1);

  return (
    <Link to="/food/week" className="mt-5 block rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">This week</h2>
        <span className="text-xs text-ink-muted">Details ›</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-1.5">
        {data.days.map((day) => {
          const isToday = day.date === today;
          const heightPct = Math.max(4, Math.min(100, (day.calories / maxCalories) * 100));
          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-10 w-full items-end">
                <div className={`w-full rounded-t ${isToday ? "bg-accent" : "bg-surface-2"}`} style={{ height: `${heightPct}%` }} />
              </div>
              <span className={`text-[10px] ${isToday ? "font-semibold text-accent" : "text-ink-muted"}`}>{dayLetter(day.date)}</span>
            </div>
          );
        })}
      </div>
    </Link>
  );
}
