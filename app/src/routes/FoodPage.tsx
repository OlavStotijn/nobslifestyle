import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDailySummary, useDeleteFoodLog, useFoodLogs, todayLocalDate, type FoodLog, type MealType } from "../api/hooks/useFoodLogs";
import { useCardioSessionsForDate, type CardioSession } from "../api/hooks/useCardioSessions";
import { useNutritionProfile } from "../api/hooks/useNutritionProfile";
import { ThemeToggle } from "../components/ThemeToggle";
import { formatDuration } from "../lib/geo";
import { useUnits } from "../lib/useUnits";
import { useTranslation } from "../i18n/I18nContext";

function LogRow({ log, onDelete }: { log: FoodLog; onDelete: (id: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{log.foodItemName}</p>
        <p className="text-sm text-ink-muted">
          {log.quantityG}g · {log.calories} kcal
        </p>
      </div>
      <button type="button" onClick={() => onDelete(log.id)} className="ml-3 shrink-0 text-sm text-ink-muted hover:text-red-500">
        Remove
      </button>
    </div>
  );
}

function ActivityRow({ activity }: { activity: CardioSession }) {
  const { formatDistance, distanceLabel } = useUnits();
  const { t } = useTranslation();
  const label = activity.activityType === "running" ? "Run" : "Ride";
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">
          {label} · {formatDistance(activity.distanceM)}
          {distanceLabel}
        </p>
        <p className="text-sm text-ink-muted">
          {formatDuration(activity.durationS)} ·{" "}
          {activity.subtractFromIntake ? `+${activity.calories} kcal` : `${activity.calories} kcal (${t("food.notAdded")})`}
        </p>
      </div>
    </div>
  );
}

export function FoodPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const date = todayLocalDate();
  const { data: logs, isLoading: logsLoading } = useFoodLogs(date);
  const { data: summary } = useDailySummary(date);
  const { data: activities } = useCardioSessionsForDate(date);
  const { data: profile } = useNutritionProfile();
  const deleteMutation = useDeleteFoodLog(date);

  const baseTarget = profile?.targetKcal ?? 0;
  const consumed = summary?.calories ?? 0;
  const burned = summary?.burnedKcal ?? 0;
  const target = baseTarget + burned;
  const remaining = Math.max(0, target - consumed);

  const MEAL_ORDER: { key: MealType; label: string }[] = [
    { key: "breakfast", label: t("food.breakfast") },
    { key: "lunch", label: t("food.lunch") },
    { key: "dinner", label: t("food.dinner") },
    { key: "snack", label: t("food.snacks") },
  ];

  const grouped = MEAL_ORDER.map((meal) => ({
    ...meal,
    logs: (logs ?? []).filter((l) => l.mealType === meal.key),
  }));

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-end">
        <ThemeToggle />
      </div>

      <h1 className="mt-4 text-2xl font-bold text-ink">{t("food.today")}</h1>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-4xl font-bold text-accent">{remaining}</p>
        <p className="text-sm text-ink-muted">
          {t("food.kcalRemaining")} · {consumed} {t("food.eaten")}
          {burned > 0 ? ` · +${burned} ${t("summary.fromActivity")}` : ""} / {target}
        </p>
      </div>

      <div className="mt-6 flex flex-1 flex-col gap-5">
        {logsLoading && <p className="text-ink-muted">{t("common.loading")}</p>}

        {!logsLoading && activities && activities.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">{t("food.activity")}</h2>
            <div className="flex flex-col gap-2">
              {activities.map((a) => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </div>
          </div>
        )}

        {!logsLoading &&
          grouped.map((meal) => (
            <div key={meal.key}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">{meal.label}</h2>
              {meal.logs.length === 0 ? (
                <p className="text-sm text-ink-muted">{t("food.nothingLoggedYet")}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {meal.logs.map((log) => (
                    <LogRow key={log.id} log={log} onDelete={(id) => deleteMutation.mutate(id)} />
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      <motion.button
        type="button"
        onClick={() => navigate("/food/add")}
        whileTap={{ scale: 0.88 }}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white shadow-lg"
        aria-label="Add food"
      >
        +
      </motion.button>
    </div>
  );
}
