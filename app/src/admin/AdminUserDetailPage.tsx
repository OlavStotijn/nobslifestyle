import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  useAdminUser,
  useDeleteUser,
  useImpersonateUser,
  useReactivateUser,
  useSuspendUser,
} from "../api/hooks/useAdmin";

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

const ACTION_LABEL: Record<string, string> = {
  impersonate_start: "Logged in as this user",
  impersonate_end: "Returned from impersonation",
  suspend_user: "Suspended",
  reactivate_user: "Reactivated",
  delete_user: "Deleted",
  moderation_remove: "Removed content",
};

export function AdminUserDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const { data, isLoading } = useAdminUser(userId);
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();
  const deleteUser = useDeleteUser();
  const impersonate = useImpersonateUser();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-ink-muted">Loading…</p>;
  if (!data) return <p className="text-ink-muted">Not found.</p>;

  const { user, oauthIdentities, auditLog } = data;

  async function handleImpersonate() {
    if (!window.confirm(`Log in as ${user.displayName}? This creates a 30-minute session, logged in the audit trail.`)) return;
    setError(null);
    try {
      await impersonate.mutateAsync(userId);
      window.location.href = "https://nobslifestyle.com/";
    } catch {
      setError("Failed to start impersonation.");
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Permanently delete ${user.displayName}'s account? This cannot be undone.`)) return;
    await deleteUser.mutateAsync(userId);
    navigate("/users");
  }

  return (
    <div>
      <button type="button" onClick={() => navigate("/users")} className="text-sm text-ink-muted">
        ← Back to users
      </button>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{user.displayName}</h1>
          <p className="text-ink-muted">{user.email}</p>
          {user.username && <p className="text-sm text-ink-muted">@{user.username}</p>}
        </div>
        {user.suspendedAt ? (
          <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-medium text-red-500">Suspended</span>
        ) : (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">Active</span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xl font-bold text-ink">{user.usage.foodLogs}</p>
          <p className="text-xs text-ink-muted">Food logs</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xl font-bold text-ink">{user.usage.workouts}</p>
          <p className="text-xs text-ink-muted">Workouts finished</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xl font-bold text-ink">{user.usage.cardioSessions}</p>
          <p className="text-xs text-ink-muted">Cardio sessions</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xl font-bold text-ink">{user.usage.checklistCompletions}</p>
          <p className="text-xs text-ink-muted">Checklist ticks</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-ink-muted">Joined</span>
          <span className="text-ink">{formatDateTime(user.createdAt)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-ink-muted">Last seen</span>
          <span className="text-ink">{formatDateTime(user.lastSeenAt)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-ink-muted">Email verified</span>
          <span className="text-ink">{user.emailVerified ? "Yes" : "No"}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-ink-muted">Linked sign-in</span>
          <span className="text-ink">{oauthIdentities.length ? oauthIdentities.map((o) => o.provider).join(", ") : "Password only"}</span>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleImpersonate}
          disabled={impersonate.isPending || !!user.suspendedAt}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Log in as this user
        </button>
        {user.suspendedAt ? (
          <button
            type="button"
            onClick={() => reactivate.mutate(userId)}
            disabled={reactivate.isPending}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Reactivate
          </button>
        ) : (
          <button
            type="button"
            onClick={() => suspend.mutate(userId)}
            disabled={suspend.isPending}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Suspend
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteUser.isPending}
          className="rounded-xl border border-red-500 px-4 py-2.5 text-sm font-semibold text-red-500 disabled:opacity-50"
        >
          Delete account
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Audit history</h2>
        {auditLog.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No admin actions recorded for this user yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {auditLog.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                <p className="text-ink">
                  <span className="font-medium">{ACTION_LABEL[entry.action] ?? entry.action}</span> by {entry.adminDisplayName}
                </p>
                {entry.details && <p className="text-ink-muted">{entry.details}</p>}
                <p className="text-xs text-ink-muted">{formatDateTime(entry.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link to="/users" className="mt-6 inline-block text-sm text-ink-muted">
        ← All users
      </Link>
    </div>
  );
}
