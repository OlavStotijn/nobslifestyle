import { Link } from "react-router-dom";
import { useModerationQueue, useRemoveModeratedPhoto, useReports, useResolveReport } from "../api/hooks/useAdmin";

export function AdminModerationPage() {
  const { data: photos, isLoading } = useModerationQueue();
  const remove = useRemoveModeratedPhoto();
  const { data: reports } = useReports();
  const resolve = useResolveReport();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Moderation</h1>

      <h2 className="mt-4 text-lg font-semibold text-ink">User reports</h2>
      {reports?.length === 0 && <p className="mt-2 text-sm text-ink-muted">No open reports.</p>}
      <div className="mt-2 flex flex-col gap-2">
        {reports?.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
            <p className="text-ink">
              <span className="font-semibold capitalize">{r.targetType}</span> by{" "}
              <Link to={`/users/${r.targetUserId}`} className="font-medium text-accent">
                {r.targetName}
              </Link>{" "}
              — <span className="font-semibold">{r.reason}</span>
            </p>
            {r.content && <p className="mt-1 rounded-lg bg-surface-2 p-2 text-ink-muted">{r.content}</p>}
            <p className="mt-1 text-xs text-ink-muted">
              Reported by {r.reporterName} · {new Date(r.createdAt).toLocaleString()}
            </p>
            <div className="mt-2 flex gap-2">
              {r.targetType !== "user" && (
                <button
                  type="button"
                  onClick={() => resolve.mutate({ id: r.id, removeContent: true })}
                  disabled={resolve.isPending}
                  className="rounded-lg border border-red-500 px-3 py-1 font-semibold text-red-500 disabled:opacity-50"
                >
                  Remove content
                </button>
              )}
              <button
                type="button"
                onClick={() => resolve.mutate({ id: r.id, removeContent: false })}
                disabled={resolve.isPending}
                className="rounded-lg border border-border px-3 py-1 font-semibold text-ink disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink">Photo spot-check</h2>
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
