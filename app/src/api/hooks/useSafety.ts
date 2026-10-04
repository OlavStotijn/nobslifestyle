import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export type ReportTargetType = "post" | "comment" | "user";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "other";

export interface BlockedUser {
  id: number;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: ["blocks"],
    queryFn: () => api.get<{ users: BlockedUser[] }>("/blocks").then((r) => r.users),
  });
}

// Blocking changes what the feed, comments, friends and search return, so
// every cached query is stale afterwards.
export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.post(`/blocks/${userId}`),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.delete(`/blocks/${userId}`),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (input: { targetType: ReportTargetType; targetId: number; reason: ReportReason; details?: string }) =>
      api.post("/reports", input),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => api.delete("/account", { confirm: "DELETE" }),
  });
}
