import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeekSummary } from "../api/hooks/useFoodLogs";
import { FoodThumb } from "../components/FoodThumb";

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function FoodWeekPage() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const { data, isLoading } = useWeekSummary(weekStart);

  const avgCalories = data ? Math.round(data.days.reduce((sum, d) => sum + d.calories, 0) / 7) : 0;

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/food")} className="self-start text-sm text-ink-muted">
        ← Back
      </button>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => data && setWeekStart(addDays(data.weekStart, -7))}
          disabled={!data}
          className="rounded-full border border-border px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40"
        >
          ← Prev
        </button>
        <h1 className="text-lg font-bold text-ink">Week overview</h1>
        <button
          type="button"
          onClick={() => data && setWeekStart(addDays(data.weekStart, 7))}
          disabled={!data}
          className="rounded-full border border-border px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      {isLoading && <p className="mt-6 text-center text-ink-muted">Loading…</p>}

      {data && (
        <>
          <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-accent">{avgCalories}</p>
            <p className="text-sm text-ink-muted">avg kcal/day this week</p>
          </div>

          <div className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto pb-6">
            {data.days.map((day) => (
              <div key={day.date} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-ink">{formatDayLabel(day.date)}</h2>
                  <span className="text-sm text-ink-muted">{day.calories} kcal</span>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-ink-muted">
                  <span>{day.protein}g protein</span>
                  <span>{day.carbs}g carbs</span>
                  <span>{day.fat}g fat</span>
                </div>
                {day.logs.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-muted">Nothing logged.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2">
                    {day.logs.map((log) => (
                      <div key={log.id} className="flex items-center gap-3">
                        <FoodThumb url={log.foodItemImageUrl} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{log.foodItemName}</p>
                          <p className="text-xs text-ink-muted">
                            {log.quantityG}g · {log.calories} kcal
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
