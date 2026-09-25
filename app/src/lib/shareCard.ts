import { formatDuration } from "./geo";
import type { SessionDetail } from "../api/hooks/useSessions";

export type ShareFormat = "story" | "post";

export interface ShareTheme {
  id: string;
  label: string;
  swatch: string;
  background: [string, string]; // gradient stops, top -> bottom
  text: string;
  muted: string;
  accent: string;
}

export const SHARE_THEMES: ShareTheme[] = [
  { id: "nobs", label: "NoBS Green", swatch: "#5dd62c", background: ["#0f0f0f", "#0f0f0f"], text: "#f8f8f8", muted: "#9a9d9a", accent: "#5dd62c" },
  { id: "sunset", label: "Sunset", swatch: "#ff512f", background: ["#ff512f", "#f09819"], text: "#ffffff", muted: "rgba(255,255,255,0.82)", accent: "#ffffff" },
  { id: "ocean", label: "Ocean", swatch: "#2193b0", background: ["#134e5e", "#2193b0"], text: "#ffffff", muted: "rgba(255,255,255,0.82)", accent: "#8fe3ff" },
  { id: "mono", label: "Mono", swatch: "#ffffff", background: ["#050505", "#1a1a1a"], text: "#ffffff", muted: "#a3a3a3", accent: "#ffffff" },
];

const SIZES: Record<ShareFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1080 },
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

let logoImagePromise: Promise<HTMLImageElement> | null = null;
function loadLogo(): Promise<HTMLImageElement> {
  if (!logoImagePromise) {
    logoImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = "/icons/icon-512.png";
    });
  }
  return logoImagePromise;
}

export async function renderWorkoutShareCard(
  canvas: HTMLCanvasElement,
  session: SessionDetail,
  format: ShareFormat,
  theme: ShareTheme
): Promise<void> {
  const { w, h } = SIZES[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pad = w * 0.08;

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, theme.background[0]);
  gradient.addColorStop(1, theme.background[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Logo + wordmark
  const logo = await loadLogo().catch(() => null);
  const logoSize = w * 0.09;
  let y = pad;
  if (logo) ctx.drawImage(logo, pad, y, logoSize, logoSize);
  ctx.fillStyle = theme.text;
  ctx.font = `700 ${w * 0.045}px -apple-system, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("NoBSLifestyle", pad + logoSize + w * 0.03, y + logoSize / 2);

  y += logoSize + w * 0.1;

  // Title
  ctx.fillStyle = theme.text;
  ctx.font = `800 ${w * 0.075}px -apple-system, system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";
  const titleLines = wrapText(ctx, session.schemaName, w - pad * 2);
  for (const line of titleLines) {
    y += w * 0.085;
    ctx.fillText(line, pad, y);
  }

  ctx.fillStyle = theme.muted;
  ctx.font = `500 ${w * 0.032}px -apple-system, system-ui, sans-serif`;
  y += w * 0.06;
  ctx.fillText(new Date(session.startedAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }), pad, y);

  // Stat row: duration + total volume + PR count
  const durationS = session.finishedAt
    ? Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
    : 0;
  const totalVolume = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weightKg, 0),
    0
  );
  const prCount = session.progressSummary?.perExercise.filter((e) => e.badge === "pr").length ?? 0;

  y += w * 0.1;
  const stats: [string, string][] = [
    [formatDuration(durationS), "duration"],
    [`${Math.round(totalVolume)}kg`, "volume"],
    [String(prCount), prCount === 1 ? "PR" : "PRs"],
  ];
  const statWidth = (w - pad * 2) / 3;
  stats.forEach(([value, label], i) => {
    const x = pad + statWidth * i;
    ctx.fillStyle = theme.accent;
    ctx.font = `800 ${w * 0.06}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(value, x, y);
    ctx.fillStyle = theme.muted;
    ctx.font = `500 ${w * 0.026}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(label, x, y + w * 0.04);
  });

  // Exercise list
  y += w * 0.11;
  ctx.strokeStyle = theme.muted;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const maxRows = format === "story" ? 8 : 5;
  for (const ex of session.exercises.slice(0, maxRows)) {
    y += w * 0.075;
    const best = ex.sets.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a), {
      weightKg: 0,
      reps: 0,
    } as { weightKg: number; reps: number });

    ctx.fillStyle = theme.text;
    ctx.font = `600 ${w * 0.036}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(ex.exerciseName, pad, y);

    ctx.fillStyle = theme.accent;
    ctx.font = `700 ${w * 0.036}px -apple-system, system-ui, sans-serif`;
    const setLabel = ex.sets.length > 0 ? `${best.weightKg}kg × ${best.reps}` : "—";
    const setWidth = ctx.measureText(setLabel).width;
    ctx.fillText(setLabel, w - pad - setWidth, y);
  }

  // Rating footer
  if (session.rating) {
    const stars = "★".repeat(session.rating) + "☆".repeat(5 - session.rating);
    ctx.fillStyle = theme.accent;
    ctx.font = `${w * 0.05}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(stars, pad, h - pad);
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}
