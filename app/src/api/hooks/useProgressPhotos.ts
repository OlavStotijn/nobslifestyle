import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export type PhotoVisibility = "private" | "friends";

export interface ProgressPhoto {
  id: number;
  imageUrl: string;
  takenAt: string;
  weightKg: number | null;
  notes: string | null;
  visibility: PhotoVisibility;
}

export function useProgressPhotos() {
  return useQuery({
    queryKey: ["progress-photos"],
    queryFn: () => api.get<{ photos: ProgressPhoto[] }>("/progress-photos").then((r) => r.photos),
  });
}

export function useFriendProgressPhotos(friendUserId: number | undefined) {
  return useQuery({
    queryKey: ["progress-photos", "friend", friendUserId],
    queryFn: () =>
      api.get<{ photos: ProgressPhoto[] }>(`/progress-photos/friend/${friendUserId}`).then((r) => r.photos),
    enabled: friendUserId != null,
  });
}

interface UploadProgressPhotoInput {
  image: Blob;
  weightKg?: number;
  notes?: string;
  visibility: PhotoVisibility;
}

export function useUploadProgressPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadProgressPhotoInput) => {
      const form = new FormData();
      form.append("image", input.image, "progress.jpg");
      if (input.weightKg != null) form.append("weightKg", String(input.weightKg));
      if (input.notes) form.append("notes", input.notes);
      form.append("visibility", input.visibility);
      return api.postForm<{ photo: ProgressPhoto }>("/progress-photos", form).then((r) => r.photo);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress-photos"] }),
  });
}

export function useUpdateProgressPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; weightKg?: number | null; notes?: string | null; visibility?: PhotoVisibility }) =>
      api.patch<{ photo: ProgressPhoto }>(`/progress-photos/${id}`, input).then((r) => r.photo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress-photos"] }),
  });
}

export function useDeleteProgressPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/progress-photos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress-photos"] }),
  });
}
