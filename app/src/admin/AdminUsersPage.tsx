import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminUsers } from "../api/hooks/useAdmin";
import { useDebounced } from "../hooks/useDebounced";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

export function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(query, 300);
  const { data, isLoading } = useAdminUsers(debounced, page);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 25)) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Users</h1>

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Search by email, username, or name…"
        className="mt-4 w-full max-w-md rounded-xl border border-border bg-surface px-4 py-2.5 text-ink outline-none focus:border-accent"
      />

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-ink-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 font-medium">Last seen</th>
              <th className="px-4 py-2 font-medium">Food logs</th>
              <th className="px-4 py-2 font-medium">Workouts</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-ink-muted">
                  Loading…
                </td>
              </tr>
            )}
            {data?.users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link to={`/users/${u.id}`} className="font-medium text-accent">
                    {u.displayName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-ink">{u.email}</td>
                <td className="px-4 py-2 text-ink-muted">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-2 text-ink-muted">{formatDate(u.lastSeenAt)}</td>
                <td className="px-4 py-2 text-ink">{u.usage.foodLogs}</td>
                <td className="px-4 py-2 text-ink">{u.usage.workouts}</td>
                <td className="px-4 py-2">
                  {u.suspendedAt ? (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-500">Suspended</span>
                  ) : (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > 25 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-ink-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
