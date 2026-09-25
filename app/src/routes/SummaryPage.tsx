import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNutritionProfile } from "../api/hooks/useNutritionProfile";
import { useDailySummary, todayLocalDate } from "../api/hooks/useFoodLogs";
import { ThemeToggle } from "../components/ThemeToggle";
import { StatRing } from "../components/StatRing";

export function SummaryPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useNutritionProfile();
  const date = todayLocalDate();
  const { data: summary } = useDailySummary(date);

  if (isLoading) {
    return <div className="flex min-h-full items-center justify-center bg-bg text-ink-muted">Loading…</div>;
  }

  if (!profile?.onboardingCompletedAt) {
    return <Navigate to="/onboarding" replace />;
  }

  const consumed = summary?.calories ?? 0;

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-muted">Welcome back,</p>
          <h1 className="text-2xl font-bold text-ink">{user?.displayName}</h1>
        </div>
        <ThemeToggle />
      </div>

      <Link to="/food" className="mt-8 flex flex-col items-center rounded-2xl border border-border bg-surface p-6">
        <StatRing value={consumed} target={profile.targetKcal} label="kcal left" />
        <p className="mt-3 text-sm text-ink-muted">
          {consumed} / {profile.targetKcal} kcal eaten today
        </p>
      </Link>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-lg font-semibold text-ink">{profile.targetProteinG}g</p>
          <p className="text-xs text-ink-muted">Protein target</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-lg font-semibold text-ink">{profile.targetCarbsG}g</p>
          <p className="text-xs text-ink-muted">Carbs target</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-lg font-semibold text-ink">{profile.targetFatG}g</p>
          <p className="text-xs text-ink-muted">Fat target</p>
        </div>
      </div>

      <Link to="/food/add" className="mt-6 rounded-xl bg-accent px-4 py-3 text-center font-semibold text-white">
        Log food
      </Link>
    </div>
  );
}
