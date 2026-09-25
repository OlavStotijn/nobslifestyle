import type { ProgressBadgeInfo } from "../api/hooks/useSessions";

const STYLES: Record<ProgressBadgeInfo["badge"], { label: string; className: string }> = {
  pr: { label: "PR", className: "bg-accent text-white" },
  progress: { label: "Progress", className: "bg-accent-soft text-accent" },
  on_target: { label: "On target", className: "bg-surface-2 text-ink-muted" },
  regression: { label: "Down", className: "bg-red-500/15 text-red-500" },
};

function signed(n: number, suffix: string): string {
  if (n === 0) return `±0${suffix}`;
  return `${n > 0 ? "+" : ""}${n}${suffix}`;
}

export function ProgressBadge({ info }: { info: ProgressBadgeInfo }) {
  const style = STYLES[info.badge];
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <div>
        <p className="font-medium text-ink">{info.exerciseName}</p>
        <p className="text-sm text-ink-muted">
          {signed(info.weightDeltaBaseline, "kg")} vs schema
          {info.weightDeltaPrev != null && ` · ${signed(info.weightDeltaPrev, "kg")} vs last time`}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>{style.label}</span>
    </div>
  );
}
