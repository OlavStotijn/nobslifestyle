import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          if (navigator.vibrate) navigator.vibrate(200);
          onDone();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  const progress = 1 - remaining / seconds;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3"
      >
        <div className="relative h-10 w-10 shrink-0">
          <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent/20" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 * (1 - progress)}
              strokeLinecap="round"
              className="text-accent"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-ink">Resting… {remaining}s</p>
          <p className="text-sm text-ink-muted">Get ready for your next set</p>
        </div>
        <button type="button" onClick={onDone} className="shrink-0 text-sm font-semibold text-accent">
          Skip
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
