import { useEffect, useMemo, useRef, useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { useCreatePost } from "../api/hooks/useSocial";
import { ApiError } from "../api/client";

interface PostComposerProps {
  sessionId?: number;
  cardioSessionId?: number;
}

// Shared "Post to friends" flow for both strength and cardio sessions: an
// optional caption, an optional free-text location, and an optional photo
// — when a photo is attached, the feed renders it as slide one of a
// two-slide card with the workout/run stats as slide two.
export function PostComposer({ sessionId, cardioSessionId }: PostComposerProps) {
  const [open, setOpen] = useState(false);
  const [posted, setPosted] = useState(false);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();

  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhoto(file);
  }

  async function submit() {
    setError(null);
    try {
      await createPost.mutateAsync({
        sessionId,
        cardioSessionId,
        caption: caption || undefined,
        location: location || undefined,
        photo: photo ?? undefined,
      });
      setPosted(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={posted}
        className="rounded-xl border border-border px-4 py-3 font-semibold text-ink transition-opacity disabled:opacity-50"
      >
        {posted ? "Posted to friends ✓" : "Post to friends"}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <h2 className="text-lg font-bold text-ink">Post to friends</h2>

        {previewUrl ? (
          <div className="relative mt-3">
            <img src={previewUrl} alt="" className="max-h-48 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm font-medium text-ink-muted"
          >
            📷 Add a photo
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={pickPhoto} className="hidden" />

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          rows={2}
          className="mt-3 w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-accent"
        />

        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Add location (optional)"
          className="mt-2 w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-accent"
        />

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={createPost.isPending}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {createPost.isPending ? "Posting…" : "Post"}
        </button>
      </BottomSheet>
    </>
  );
}
