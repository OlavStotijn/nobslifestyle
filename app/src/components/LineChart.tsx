// Minimal hand-rolled SVG line chart — no charting library dependency,
// consistent with the rest of the app (canvas share cards, hand-drawn icons).
export function LineChart({ points, height = 140 }: { points: number[]; height?: number }) {
  if (points.length < 2) {
    return <div className="flex h-[140px] items-center justify-center text-sm text-ink-muted">Not enough data yet.</div>;
  }

  const width = 320;
  const padding = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (p - min) / range) * (height - padding * 2);
    return [x, y];
  });

  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${coords[coords.length - 1][0].toFixed(1)},${height - padding} L${coords[0][0].toFixed(1)},${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <path d={areaPath} className="fill-accent/10" />
      <path d={path} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} className="fill-accent" />
      ))}
    </svg>
  );
}
