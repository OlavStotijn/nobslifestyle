import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useFriendProgressPhotos } from "../api/hooks/useProgressPhotos";
import { ProgressPhotoGrid } from "../components/ProgressPhotoGrid";

interface LocationState {
  displayName?: string;
  username?: string | null;
}

export function FriendProfilePage() {
  const { id } = useParams();
  const friendUserId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { data: photos, isLoading } = useFriendProgressPhotos(friendUserId);

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/friends")} className="self-start text-sm text-ink-muted">
        ← Friends
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">{state.displayName ?? "Friend"}</h1>
      {state.username && <p className="text-sm text-ink-muted">@{state.username}</p>}

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Progress photos</h2>
        <div className="mt-2">
          {isLoading ? <p className="text-ink-muted">Loading…</p> : <ProgressPhotoGrid photos={photos ?? []} />}
        </div>
      </div>
    </div>
  );
}
