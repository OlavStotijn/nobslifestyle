import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "../api/hooks/useSessions";
import { renderWorkoutShareCard, canvasToBlob, SHARE_THEMES, type ShareFormat, type ShareTheme } from "../lib/shareCard";

export function ShareWorkoutPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const { data: session } = useSession(sessionId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<ShareFormat>("story");
  const [theme, setTheme] = useState<ShareTheme>(SHARE_THEMES[0]);
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!session || !canvasRef.current) return;
    setRendering(true);
    renderWorkoutShareCard(canvasRef.current, session, format, theme).finally(() => setRendering(false));
  }, [session, format, theme]);

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);
    try {
      const blob = await canvasToBlob(canvas);
      if (!blob) return;
      const file = new File([blob], "nobslifestyle-workout.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My workout" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "nobslifestyle-workout.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // user cancelled the native share sheet — not an error
    } finally {
      setSharing(false);
    }
  }

  if (!session) {
    return <div className="flex min-h-full items-center justify-center bg-bg text-ink-muted">Loading…</div>;
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate(-1)} className="self-start text-sm text-ink-muted">
        ← Back
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">Share your workout</h1>

      <div className="mt-4 flex justify-center">
        <div
          className="overflow-hidden rounded-2xl border border-border bg-surface-2"
          style={{ width: format === "story" ? "60%" : "80%", maxWidth: 320 }}
        >
          <canvas ref={canvasRef} className="w-full" style={{ display: "block", opacity: rendering ? 0.6 : 1 }} />
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setFormat("story")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
            format === "story" ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-muted"
          }`}
        >
          Story (9:16)
        </button>
        <button
          type="button"
          onClick={() => setFormat("post")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
            format === "post" ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-muted"
          }`}
        >
          Post (1:1)
        </button>
      </div>

      <div className="mt-4 flex justify-center gap-3">
        {SHARE_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t)}
            aria-label={t.label}
            className={`h-9 w-9 rounded-full border-2 ${theme.id === t.id ? "border-accent" : "border-transparent"}`}
            style={{ backgroundColor: t.swatch }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={share}
        disabled={sharing || rendering}
        className="mt-8 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {sharing ? "Sharing…" : "Share image"}
      </button>
    </div>
  );
}
