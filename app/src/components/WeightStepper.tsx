import { useRef } from "react";

interface WeightStepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  unit?: string;
}

// Press-and-hold repeat: tapping nudges by `step`, holding accelerates so
// large adjustments (e.g. 20kg → 60kg) don't take dozens of taps.
export function WeightStepper({ value, onChange, step = 2.5, min = 0, unit = "kg" }: WeightStepperProps) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  function clamp(v: number) {
    return Math.max(min, Math.round(v / step) * step);
  }

  function nudge(delta: number) {
    onChange(clamp(value + delta));
  }

  function startHold(delta: number) {
    nudge(delta);
    holdTimer.current = setTimeout(() => {
      holdInterval.current = setInterval(() => nudge(delta), 90);
    }, 400);
  }

  function stopHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
    holdTimer.current = null;
    holdInterval.current = null;
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onPointerDown={() => startHold(-step)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        className="h-12 w-12 rounded-full border border-border text-xl font-bold text-ink active:bg-surface-2"
        aria-label={`Decrease weight by ${step}${unit}`}
      >
        −
      </button>
      <div className="w-24 text-center">
        <p className="text-3xl font-bold text-ink tabular-nums">{value}</p>
        <p className="text-sm text-ink-muted">{unit}</p>
      </div>
      <button
        type="button"
        onPointerDown={() => startHold(step)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        className="h-12 w-12 rounded-full border border-border text-xl font-bold text-ink active:bg-surface-2"
        aria-label={`Increase weight by ${step}${unit}`}
      >
        +
      </button>
    </div>
  );
}
