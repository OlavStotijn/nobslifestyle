import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CameraCapture } from "../components/CameraCapture";
import { useUploadProgressPhoto, type PhotoVisibility } from "../api/hooks/useProgressPhotos";
import { useNutritionProfile } from "../api/hooks/useNutritionProfile";
import { ApiError } from "../api/client";

function DetailsStep({ photo, onBack, onSaved }: { photo: Blob; onBack: () => void; onSaved: () => void }) {
  const { data: profile } = useNutritionProfile();
  const [weightKg, setWeightKg] = useState(profile?.weightKg ? String(profile.weightKg) : "");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<PhotoVisibility>("private");
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadProgressPhoto();

  const previewUrl = useMemo(() => URL.createObjectURL(photo), [photo]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  async function save() {
    setError(null);
    try {
      await upload.mutateAsync({
        image: photo,
        weightKg: weightKg ? Number(weightKg) : undefined,
        notes: notes || undefined,
        visibility,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <button type="button" onClick={onBack} className="self-start text-sm text-ink-muted">
        ← Retake
      </button>

      <img src={previewUrl} alt="Progress preview" className="mt-4 max-h-64 w-full rounded-2xl object-cover" />

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Weight (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="Optional"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Notes</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Body fat %, measurements, how you feel…"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>

        <div>
          <span className="text-sm font-medium text-ink-muted">Visibility</span>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${
                visibility === "private" ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-muted"
              }`}
            >
              Private
            </button>
            <button
              type="button"
              onClick={() => setVisibility("friends")}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${
                visibility === "friends" ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-muted"
              }`}
            >
              Visible to friends
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={upload.isPending}
          className="mt-2 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {upload.isPending ? "Saving…" : "Save progress photo"}
        </button>
      </div>
    </div>
  );
}

export function AddProgressPhotoPage() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<Blob | null>(null);

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      {!photo ? (
        <>
          <button type="button" onClick={() => navigate("/profile")} className="self-start text-sm text-ink-muted">
            ← Cancel
          </button>
          <h1 className="mt-4 text-2xl font-bold text-ink">New progress photo</h1>
          <div className="mt-4">
            <CameraCapture onCapture={setPhoto} facingMode="user" />
          </div>
        </>
      ) : (
        <DetailsStep photo={photo} onBack={() => setPhoto(null)} onSaved={() => navigate("/profile")} />
      )}
    </div>
  );
}
