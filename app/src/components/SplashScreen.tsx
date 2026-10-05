import { useEffect, useState, type ReactNode } from "react";

const FADE_IN_MS = 500;
const MIN_HOLD_MS = 350;
const FADE_OUT_MS = 450;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Shown while AuthContext resolves the session: logo fades in, holds
// briefly (so a near-instant session check doesn't just flash the logo),
// then fades out into whatever the caller decides comes next (login or the
// app). `ready` flips to true once that decision is known.
export function SplashScreen({ ready, children }: { ready: boolean; children: ReactNode }) {
  const [visible, setVisible] = useState(reducedMotion);
  const [minHoldElapsed, setMinHoldElapsed] = useState(reducedMotion);
  const [phase, setPhase] = useState<"splash" | "fading" | "done">("splash");

  useEffect(() => {
    if (reducedMotion) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    const holdTimer = setTimeout(() => setMinHoldElapsed(true), FADE_IN_MS + MIN_HOLD_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(holdTimer);
    };
  }, []);

  // Separate from the effect below on purpose: that one flips phase to
  // "fading" as a state update, which — if it also owned the "done" timer —
  // would get its own timer torn down by the dependency-triggered re-run's
  // cleanup before the timeout ever fired (phase changing is itself a
  // dependency of that effect). Splitting them means this timer is set up
  // in a render where phase has already settled on "fading", so nothing
  // tears it down before it fires.
  useEffect(() => {
    if (phase !== "splash" || !ready || !minHoldElapsed) return;
    setPhase(reducedMotion ? "done" : "fading");
  }, [ready, minHoldElapsed, phase]);

  useEffect(() => {
    if (phase !== "fading") return;
    const timer = setTimeout(() => setPhase("done"), FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "done") return <>{children}</>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg"
      style={{
        opacity: phase === "fading" ? 0 : visible ? 1 : 0,
        transitionProperty: "opacity",
        transitionDuration: `${phase === "fading" ? FADE_OUT_MS : FADE_IN_MS}ms`,
        transitionTimingFunction: "ease",
      }}
    >
      <img src="/icons/icon-512.png" alt="" className="h-24 w-24 rounded-[22%] shadow-xl" />
    </div>
  );
}
