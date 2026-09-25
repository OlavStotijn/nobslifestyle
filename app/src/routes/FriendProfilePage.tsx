import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useFriendProgressPhotos } from "../api/hooks/useProgressPhotos";
import { useCopySchema, useFriendSchemas } from "../api/hooks/useWorkouts";
import { ProgressPhotoGrid } from "../components/ProgressPhotoGrid";
import { ApiError } from "../api/client";

interface LocationState {
  displayName?: string;
  username?: string | null;
}

function SchemaRow({ schema }: { schema: { id: number; name: string; exercises: { id: number }[] } }) {
  const copySchema = useCopySchema();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setError(null);
    try {
      await copySchema.mutateAsync(schema.id);
      setCopied(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't copy schema.");
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <div>
        <p className="font-medium text-ink">{schema.name}</p>
        <p className="text-sm text-ink-muted">{schema.exercises.length} exercises</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={copied || copySchema.isPending}
        className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {copied ? "Copied ✓" : copySchema.isPending ? "Copying…" : "Copy"}
      </button>
    </div>
  );
}

export function FriendProfilePage() {
  const { id } = useParams();
  const friendUserId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { data: photos, isLoading } = useFriendProgressPhotos(friendUserId);
  const { data: schemas, isLoading: schemasLoading } = useFriendSchemas(friendUserId);

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/friends")} className="self-start text-sm text-ink-muted">
        ← Friends
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">{state.displayName ?? "Friend"}</h1>
      {state.username && <p className="text-sm text-ink-muted">@{state.username}</p>}

      {(schemasLoading || (schemas && schemas.length > 0)) && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Schemas</h2>
          <div className="mt-2 flex flex-col gap-2">
            {schemasLoading && <p className="text-ink-muted">Loading…</p>}
            {schemas?.map((schema) => (
              <SchemaRow key={schema.id} schema={schema} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Progress photos</h2>
        <div className="mt-2">
          {isLoading ? <p className="text-ink-muted">Loading…</p> : <ProgressPhotoGrid photos={photos ?? []} />}
        </div>
      </div>
    </div>
  );
}
