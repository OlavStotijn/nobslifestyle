import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSendFriendRequest, useUserSearch } from "../api/hooks/useSocial";
import { useDebounced } from "../hooks/useDebounced";
import { ApiError } from "../api/client";

export function AddFriendPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);
  const { data: results, isFetching } = useUserSearch(debouncedQuery);
  const sendRequest = useSendFriendRequest();
  const [sentTo, setSentTo] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function send(userId: number, username: string | null) {
    if (!username) return;
    setError(null);
    try {
      await sendRequest.mutateAsync(username);
      setSentTo((prev) => new Set(prev).add(userId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/friends")} className="self-start text-sm text-ink-muted">
        ← Cancel
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">Add a friend</h1>

      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by username…"
        className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
      />

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex flex-1 flex-col gap-2">
        {isFetching && <p className="text-ink-muted">Searching…</p>}
        {results?.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <div>
              <p className="font-medium text-ink">{u.displayName}</p>
              <p className="text-sm text-ink-muted">@{u.username}</p>
            </div>
            <button
              type="button"
              onClick={() => send(u.id, u.username)}
              disabled={sentTo.has(u.id) || sendRequest.isPending}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sentTo.has(u.id) ? "Sent" : "Request"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
