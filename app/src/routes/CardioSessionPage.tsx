import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { totalDistance, formatDistance, formatDuration, formatPace, formatSpeed, type RoutePoint } from "../lib/geo";
import { useCreateCardioSession, useUpdateCardioSession, type ActivityType, type CardioSession } from "../api/hooks/useCardioSessions";
import { useCreatePost } from "../api/hooks/useSocial";
import { ApiError } from "../api/client";

type Status = "tracking" | "paused" | "finishing";

function TrackingView({
  activityType,
  onFinished,
}: {
  activityType: ActivityType;
  onFinished: (session: CardioSession) => void;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("tracking");
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [elapsedS, setElapsedS] = useState(0);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startedAtRef = useRef(new Date().toISOString());
  const watchIdRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createSession = useCreateCardioSession();

  function startWatch() {
    if (!("geolocation" in navigator)) {
      setGeoError("This device doesn't support GPS tracking.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPoints((prev) => [...prev, { lat: pos.coords.latitude, lng: pos.coords.longitude, t: pos.timestamp }]);
      },
      () => setGeoError("Couldn't access your location. Check permissions and try again."),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  }

  useEffect(() => {
    startWatch();
    tickRef.current = setInterval(() => {
      const startedMs = new Date(startedAtRef.current).getTime();
      const pausedMs = pausedMsRef.current + (pauseStartedAtRef.current ? Date.now() - pauseStartedAtRef.current : 0);
      setElapsedS(Math.max(0, Math.floor((Date.now() - startedMs - pausedMs) / 1000)));
    }, 1000);

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePause() {
    if (status === "tracking") {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      pauseStartedAtRef.current = Date.now();
      setStatus("paused");
    } else if (status === "paused") {
      if (pauseStartedAtRef.current) pausedMsRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
      startWatch();
      setStatus("tracking");
    }
  }

  async function finish() {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    setStatus("finishing");
    setSaveError(null);

    try {
      const session = await createSession.mutateAsync({
        activityType,
        startedAt: startedAtRef.current,
        finishedAt: new Date().toISOString(),
        distanceM: distance,
        durationS: elapsedS,
        route: points,
        subtractFromIntake: true,
      });
      onFinished(session);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save session.");
      setStatus("paused");
    }
  }

  const distance = totalDistance(points);
  const label = activityType === "running" ? "Run" : "Ride";

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/workouts")} className="self-start text-sm text-ink-muted">
        ← Exit
      </button>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{label} in progress</p>

        <p className="mt-4 text-6xl font-bold tabular-nums text-ink">{formatDistance(distance)}</p>
        <p className="text-ink-muted">km</p>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-ink">{formatDuration(elapsedS)}</p>
            <p className="text-xs text-ink-muted">time</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-ink">
              {activityType === "running" ? formatPace(distance, elapsedS) : formatSpeed(distance, elapsedS)}
            </p>
            <p className="text-xs text-ink-muted">{activityType === "running" ? "pace" : "speed"}</p>
          </div>
        </div>

        {geoError && <p className="mt-4 text-sm text-red-500">{geoError}</p>}
        {saveError && <p className="mt-4 text-sm text-red-500">{saveError}</p>}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={togglePause}
          className="flex-1 rounded-xl border border-border px-4 py-4 font-semibold text-ink"
        >
          {status === "paused" ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={status === "finishing"}
          className="flex-1 rounded-xl bg-accent px-4 py-4 font-semibold text-white disabled:opacity-50"
        >
          {status === "finishing" ? "Saving…" : "Finish"}
        </button>
      </div>
    </div>
  );
}

function FinishedView({ session }: { session: CardioSession }) {
  const [subtract, setSubtract] = useState(session.subtractFromIntake);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [posted, setPosted] = useState(false);
  const updateSession = useUpdateCardioSession();
  const createPost = useCreatePost();

  async function toggleSubtract() {
    const next = !subtract;
    setSubtract(next);
    await updateSession.mutateAsync({ id: session.id, subtractFromIntake: next });
  }

  async function saveRatingAndNotes(nextRating: number) {
    setRating(nextRating);
    await updateSession.mutateAsync({ id: session.id, rating: nextRating, notes: notes || undefined });
  }

  async function post() {
    await createPost.mutateAsync({ cardioSessionId: session.id });
    setPosted(true);
  }

  const label = session.activityType === "running" ? "Run" : "Ride";

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex flex-1 flex-col justify-center text-center">
        <h1 className="text-2xl font-bold text-ink">{label} complete</h1>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-lg font-semibold text-ink">{formatDistance(session.distanceM)}</p>
            <p className="text-xs text-ink-muted">km</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-lg font-semibold text-ink">{formatDuration(session.durationS)}</p>
            <p className="text-xs text-ink-muted">time</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-lg font-semibold text-ink">{session.calories}</p>
            <p className="text-xs text-ink-muted">kcal</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleSubtract}
          className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left"
        >
          <span className="text-sm text-ink">Add burned calories to today's food budget</span>
          <span
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${subtract ? "bg-accent" : "bg-surface-2"}`}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: subtract ? "translateX(1.125rem)" : "translateX(0.125rem)" }}
            />
          </span>
        </button>

        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => saveRatingAndNotes(n)} className="text-3xl">
              {n <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => updateSession.mutate({ id: session.id, notes: notes || undefined })}
          placeholder="Notes (optional)"
          rows={2}
          className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={post}
            disabled={posted || createPost.isPending}
            className="rounded-xl border border-border px-4 py-3 font-semibold text-ink disabled:opacity-50"
          >
            {posted ? "Posted to friends ✓" : createPost.isPending ? "Posting…" : "Post to friends"}
          </button>
          <Link to="/workouts" className="rounded-xl bg-accent px-4 py-3 font-semibold text-white">
            Done
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CardioSessionPage() {
  const { activityType } = useParams<{ activityType: ActivityType }>();
  const [finishedSession, setFinishedSession] = useState<CardioSession | null>(null);

  if (activityType !== "running" && activityType !== "cycling") {
    return <div className="flex min-h-full items-center justify-center bg-bg text-ink-muted">Unknown activity.</div>;
  }

  if (finishedSession) return <FinishedView session={finishedSession} />;

  return <TrackingView activityType={activityType} onFinished={setFinishedSession} />;
}
