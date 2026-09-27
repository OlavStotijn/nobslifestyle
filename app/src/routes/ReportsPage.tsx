import { lazy, Suspense, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";

// Recharts is a sizeable dependency — lazy-loaded so it only loads for
// people who actually open Reports, same pattern as BarcodeScanner in
// AddFoodPage.tsx.
const WeightReport = lazy(() => import("../components/reports/WeightReport").then((m) => ({ default: m.WeightReport })));
const NutritionReport = lazy(() => import("../components/reports/NutritionReport").then((m) => ({ default: m.NutritionReport })));
const StrengthReport = lazy(() => import("../components/reports/StrengthReport").then((m) => ({ default: m.StrengthReport })));
const CardioReport = lazy(() => import("../components/reports/CardioReport").then((m) => ({ default: m.CardioReport })));

type ReportTab = "weight" | "nutrition" | "strength" | "cardio";

const TABS: { key: ReportTab; label: string }[] = [
  { key: "weight", label: "Weight" },
  { key: "nutrition", label: "Nutrition" },
  { key: "strength", label: "Strength" },
  { key: "cardio", label: "Cardio" },
];

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("weight");

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Reports</h1>
        <ThemeToggle />
      </div>

      <div className="mt-4 flex gap-2 rounded-xl bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-accent text-white" : "text-ink-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        <Suspense fallback={<p className="mt-6 text-center text-ink-muted">Loading…</p>}>
          {tab === "weight" && <WeightReport />}
          {tab === "nutrition" && <NutritionReport />}
          {tab === "strength" && <StrengthReport />}
          {tab === "cardio" && <CardioReport />}
        </Suspense>
      </div>
    </div>
  );
}
