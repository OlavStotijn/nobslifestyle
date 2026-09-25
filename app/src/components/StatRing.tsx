interface StatRingProps {
  value: number;
  target: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}

export function StatRing({ value, target, label, size = 176, strokeWidth = 14 }: StatRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = target > 0 ? Math.min(1, value / target) : 0;
  const offset = circumference * (1 - fraction);
  const remaining = Math.max(0, target - value);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--color-surface-2)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease, stroke 300ms ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-ink">{remaining}</span>
        <span className="text-xs text-ink-muted">{label}</span>
      </div>
    </div>
  );
}
