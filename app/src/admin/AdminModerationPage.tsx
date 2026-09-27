import { Link } from "react-router-dom";
import { useModerationQueue, useRemoveModeratedPhoto } from "../api/hooks/useAdmin";

export function AdminModerationPage() {
  const { data: photos, isLoading } = useModerationQueue();
  const remove = useRemoveModeratedPhoto();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Moderation</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Recent post and progress photos, for manual spot-review on top of the automatic AI moderation applied at upload.
      </p>

      {isLoading && <p className="mt-4 text-ink-muted">Loading…</p>}
      {photos?.length === 0 && <p className="mt-4 text-ink-muted">Nothing to review.</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos?.map((p) => (
          <div key={`${p.type}-${p.id}`} className="overflow-hidden rounded-xl border border-border bg-surface">
            <img src={p.imageUrl} alt="" className="aspect-square w-full object-cover" />
            <div className="p-2 text-xs">
              <Link to={`/users/${p.userId}`} className="font-medium text-accent">
                {p.displayName}
              </Link>
              <p className="text-ink-muted">{new Date(p.createdAt).toLocaleDateString()}</p>
              <button
                type="button"
                onClick={() => remove.mutate({ type: p.type, id: p.id })}
                disabled={remove.isPending}
                className="mt-1 w-full rounded-lg border border-red-500 py-1 font-semibold text-red-500 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
