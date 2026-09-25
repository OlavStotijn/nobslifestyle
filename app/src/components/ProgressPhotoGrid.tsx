import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { useDeleteProgressPhoto, useUpdateProgressPhoto, type ProgressPhoto } from "../api/hooks/useProgressPhotos";

function PhotoDetailSheet({
  photo,
  editable,
  onClose,
}: {
  photo: ProgressPhoto | null;
  editable: boolean;
  onClose: () => void;
}) {
  const deletePhoto = useDeleteProgressPhoto();
  const updatePhoto = useUpdateProgressPhoto();

  if (!photo) return null;

  async function toggleVisibility() {
    await updatePhoto.mutateAsync({ id: photo!.id, visibility: photo!.visibility === "private" ? "friends" : "private" });
  }

  async function remove() {
    await deletePhoto.mutateAsync(photo!.id);
    onClose();
  }

  return (
    <BottomSheet open={photo != null} onClose={onClose}>
      <img src={photo.imageUrl} alt="Progress" className="max-h-80 w-full rounded-2xl object-cover" />
      <div className="mt-4 flex items-center justify-between">
        <div>
          {photo.weightKg != null && <p className="text-lg font-semibold text-ink">{photo.weightKg}kg</p>}
          <p className="text-sm text-ink-muted">{new Date(photo.takenAt).toLocaleDateString()}</p>
        </div>
        {editable && (
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-muted">
            {photo.visibility === "friends" ? "Visible to friends" : "Private"}
          </span>
        )}
      </div>
      {photo.notes && <p className="mt-2 text-ink-muted">{photo.notes}</p>}

      {editable && (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={toggleVisibility}
            disabled={updatePhoto.isPending}
            className="rounded-xl border border-border px-4 py-3 font-semibold text-ink disabled:opacity-50"
          >
            {photo.visibility === "private" ? "Share with friends" : "Make private"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={deletePhoto.isPending}
            className="rounded-xl border border-red-500/30 px-4 py-3 font-semibold text-red-500 disabled:opacity-50"
          >
            {deletePhoto.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

export function ProgressPhotoGrid({ photos, editable = false }: { photos: ProgressPhoto[]; editable?: boolean }) {
  const [selected, setSelected] = useState<ProgressPhoto | null>(null);

  if (photos.length === 0) {
    return <p className="text-ink-muted">No progress photos yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelected(photo)}
            className="relative aspect-square overflow-hidden rounded-xl bg-surface-2"
          >
            <img src={photo.imageUrl} alt="Progress" className="h-full w-full object-cover" />
            {photo.weightKg != null && (
              <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {photo.weightKg}kg
              </span>
            )}
          </button>
        ))}
      </div>

      <PhotoDetailSheet photo={selected} editable={editable} onClose={() => setSelected(null)} />
    </>
  );
}
