import { Link } from "react-router-dom";
import { useFeed, useFriendRequests, useToggleLike, type FeedPost } from "../api/hooks/useSocial";
import { ThemeToggle } from "../components/ThemeToggle";

const BADGE_LABEL: Record<string, string> = { pr: "PR", progress: "Progress", on_target: "On target", regression: "Down" };
const BADGE_CLASS: Record<string, string> = {
  pr: "bg-accent text-white",
  progress: "bg-accent-soft text-accent",
  on_target: "bg-surface-2 text-ink-muted",
  regression: "bg-red-500/15 text-red-500",
};

function PostCard({ post }: { post: FeedPost }) {
  const toggleLike = useToggleLike();

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-ink">{post.user.displayName}</p>
          <p className="text-xs text-ink-muted">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
        {post.session.progressSummary && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE_CLASS[post.session.progressSummary.sessionBadge]}`}
          >
            {BADGE_LABEL[post.session.progressSummary.sessionBadge]}
          </span>
        )}
      </div>

      <p className="mt-3 font-medium text-ink">{post.session.schemaName}</p>
      {post.caption && <p className="mt-1 text-ink-muted">{post.caption}</p>}
      {post.session.rating && (
        <p className="mt-1 text-sm text-ink-muted">
          {"★".repeat(post.session.rating)}
          {"☆".repeat(5 - post.session.rating)}
        </p>
      )}

      <button
        type="button"
        onClick={() => toggleLike.mutate({ postId: post.postId, liked: post.likedByMe })}
        className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${post.likedByMe ? "text-accent" : "text-ink-muted"}`}
      >
        {post.likedByMe ? "♥" : "♡"} {post.likeCount > 0 ? post.likeCount : ""} {post.likeCount === 1 ? "like" : "likes"}
      </button>
    </div>
  );
}

function FriendsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" strokeLinecap="round" />
      <path d="M17 4v6M14 7h6" strokeLinecap="round" />
    </svg>
  );
}

export function FeedPage() {
  const { data: posts, isLoading } = useFeed();
  const { data: requests } = useFriendRequests();
  const pendingCount = requests?.length ?? 0;

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Feed</h1>
        <div className="flex items-center gap-3">
          <Link to="/friends" className="relative text-ink" aria-label="Friends">
            <FriendsIcon />
            {pendingCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="mt-6 flex flex-1 flex-col gap-3">
        {isLoading && <p className="text-ink-muted">Loading…</p>}
        {!isLoading && posts?.length === 0 && (
          <p className="text-ink-muted">No posts yet. Finish a workout and share it, or add some friends.</p>
        )}
        {posts?.map((post) => (
          <PostCard key={post.postId} post={post} />
        ))}
      </div>
    </div>
  );
}
