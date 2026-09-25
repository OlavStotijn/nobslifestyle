import { Link } from "react-router-dom";
import { useFriendRequests, useFriends, useRespondToFriendRequest } from "../api/hooks/useSocial";
import { ThemeToggle } from "../components/ThemeToggle";

export function FriendsPage() {
  const { data: friends, isLoading } = useFriends();
  const { data: requests } = useFriendRequests();
  const respond = useRespondToFriendRequest();

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-between">
        <Link to="/feed" className="text-sm text-ink-muted">
          ← Feed
        </Link>
        <ThemeToggle />
      </div>

      <h1 className="mt-4 text-2xl font-bold text-ink">Friends</h1>

      {requests && requests.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Requests</h2>
          <div className="mt-2 flex flex-col gap-2">
            {requests.map((r) => (
              <div key={r.friendshipId} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{r.user.displayName}</p>
                  <p className="text-sm text-ink-muted">@{r.user.username}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respond.mutate({ friendshipId: r.friendshipId, accept: true })}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => respond.mutate({ friendshipId: r.friendshipId, accept: false })}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-1 flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Your friends</h2>
        {isLoading && <p className="text-ink-muted">Loading…</p>}
        {!isLoading && friends?.length === 0 && <p className="text-ink-muted">No friends yet.</p>}
        {friends?.map((f) => (
          <Link
            key={f.friendshipId}
            to={`/friends/${f.user.id}`}
            state={{ displayName: f.user.displayName, username: f.user.username }}
            className="rounded-xl border border-border bg-surface px-4 py-3"
          >
            <p className="font-medium text-ink">{f.user.displayName}</p>
            <p className="text-sm text-ink-muted">@{f.user.username}</p>
          </Link>
        ))}
      </div>

      <Link to="/friends/add" className="mt-6 rounded-xl bg-accent px-4 py-3 text-center font-semibold text-white">
        + Add friend
      </Link>
    </div>
  );
}
