import { useRef } from "react";
import { useUnits } from "../lib/useUnits";

interface WeightStepperProps {
  valueKg: number;
  onChangeKg: (nextKg: number) => void;
  min?: number;
}

// Press-and-hold repeat: tapping nudges by one step, holding accelerates so
// large adjustments (e.g. 20kg → 60kg) don't take dozens of taps. Value and
// onChange are always in kg (the API's canonical unit) — display and step
// size adapt to the user's preferred unit.
export function WeightStepper({ valueKg, onChangeKg, min = 0 }: WeightStepperProps) {
  const { weightUnit, weightLabel, kgToDisplay, displayToKg } = useUnits();
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = weightUnit === "lb" ? 5 : 2.5;
  const displayValue = Math.round(kgToDisplay(valueKg) / step) * step;

  function nudge(deltaSteps: number) {
    const nextDisplay = Math.max(0, displayValue + deltaSteps * step);
    onChangeKg(Math.max(min, displayToKg(nextDisplay)));
  }

  function startHold(deltaSteps: number) {
    nudge(deltaSteps);
    holdTimer.current = setTimeout(() => {
      holdInterval.current = setInterval(() => nudge(deltaSteps), 90);
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
        onPointerDown={() => startHold(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        className="h-12 w-12 rounded-full border border-border text-xl font-bold text-ink active:bg-surface-2"
        aria-label={`Decrease weight by ${step}${weightLabel}`}
      >
        −
      </button>
      <div className="w-24 text-center">
        <p className="text-3xl font-bold text-ink tabular-nums">{Number(displayValue.toFixed(1))}</p>
        <p className="text-sm text-ink-muted">{weightLabel}</p>
      </div>
      <button
        type="button"
        onPointerDown={() => startHold(1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        className="h-12 w-12 rounded-full border border-border text-xl font-bold text-ink active:bg-surface-2"
        aria-label={`Increase weight by ${step}${weightLabel}`}
      >
        +
      </button>
    </div>
  );
}
