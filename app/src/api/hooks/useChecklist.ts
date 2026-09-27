import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export type ChecklistRecurrence = "none" | "daily" | "weekly";

export interface ChecklistParticipant {
  userId: number;
  displayName: string;
  completed: boolean;
}

export interface ChecklistPendingCollaborator {
  collaboratorId: number;
  userId: number;
  displayName: string;
}

export interface ChecklistItemInstance {
  id: number;
  title: string;
  notes: string | null;
  ownerUserId: number;
  ownerDisplayName: string;
  reminderTime: string | null;
  deadlineTime: string | null;
  linkedWorkoutSchemaId: number | null;
  linkedWorkoutSchemaName: string | null;
  linkedFoodItemId: number | null;
  linkedFoodItemName: string | null;
  myCompleted: boolean;
  done: boolean;
  participants: ChecklistParticipant[];
  pendingCollaborators: ChecklistPendingCollaborator[];
}

export interface ChecklistItem {
  id: number;
  ownerUserId: number;
  title: string;
  notes: string | null;
  startDate: string;
  recurrence: ChecklistRecurrence;
  recurrenceWeekdays: number[];
  reminderTime: string | null;
  deadlineTime: string | null;
  linkedWorkoutSchemaId: number | null;
  linkedWorkoutSchemaName?: string | null;
  linkedFoodItemId: number | null;
  linkedFoodItemName?: string | null;
  archivedAt: string | null;
}

export interface ChecklistPendingInvite {
  collaboratorId: number;
  checklistItemId: number;
  title: string;
  ownerUserId: number;
  ownerDisplayName: string;
}

export function useChecklistItems(date?: string) {
  const query = date ? `?date=${date}` : "";
  return useQuery({
    queryKey: ["checklist-items", date ?? "today"],
    queryFn: () => api.get<{ date: string; items: ChecklistItemInstance[] }>(`/checklist/items${query}`),
  });
}

export function useChecklistItem(id: number | undefined) {
  return useQuery({
    queryKey: ["checklist-item", id],
    queryFn: () => api.get<{ item: ChecklistItem }>(`/checklist/items/${id}`).then((r) => r.item),
    enabled: id != null,
  });
}

export function usePendingChecklistInvites() {
  return useQuery({
    queryKey: ["checklist-pending-invites"],
    queryFn: () => api.get<{ invites: ChecklistPendingInvite[] }>("/checklist/pending-invites").then((r) => r.invites),
  });
}

export interface CreateChecklistItemInput {
  title: string;
  notes?: string;
  startDate?: string;
  recurrence?: ChecklistRecurrence;
  recurrenceWeekdays?: number[];
  reminderTime?: string;
  deadlineTime?: string;
  linkedWorkoutSchemaId?: number;
  linkedFoodItemId?: number;
  collaboratorUserId?: number;
}

function invalidateChecklist(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["checklist-items"] });
  queryClient.invalidateQueries({ queryKey: ["checklist-pending-invites"] });
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChecklistItemInput) => api.post<{ item: ChecklistItem }>("/checklist/items", input).then((r) => r.item),
    onSuccess: () => invalidateChecklist(queryClient),
  });
}

export interface UpdateChecklistItemInput {
  title?: string;
  notes?: string | null;
  reminderTime?: string | null;
  deadlineTime?: string | null;
  linkedWorkoutSchemaId?: number | null;
  linkedFoodItemId?: number | null;
  archived?: boolean;
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & UpdateChecklistItemInput) =>
      api.patch<{ item: ChecklistItem }>(`/checklist/items/${id}`, input).then((r) => r.item),
    onSuccess: () => invalidateChecklist(queryClient),
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/checklist/items/${id}`),
    onSuccess: () => invalidateChecklist(queryClient),
  });
}

export function useToggleChecklistItem(date?: string) {
  const queryClient = useQueryClient();
  const query = date ? `?date=${date}` : "";
  return useMutation({
    mutationFn: (id: number) => api.post<{ completed: boolean }>(`/checklist/items/${id}/toggle${query}`).then((r) => r.completed),
    onSuccess: () => invalidateChecklist(queryClient),
  });
}

export function useRespondToChecklistInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collaboratorId, accept }: { collaboratorId: number; accept: boolean }) =>
      api.post(`/checklist/collab/${collaboratorId}/respond`, { accept }),
    onSuccess: () => invalidateChecklist(queryClient),
  });
}

export function useShareChecklist() {
  return useMutation({
    mutationFn: (date?: string) => api.post<{ ok: true; doneCount: number; totalCount: number }>("/checklist/share", { date }),
  });
}
