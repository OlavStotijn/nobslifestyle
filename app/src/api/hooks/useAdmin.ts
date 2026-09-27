import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface AdminMetrics {
  totalUsers: number;
  signupsPerDay: { day: string; count: number }[];
  active24h: number;
  active7d: number;
  active30d: number;
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => api.get<AdminMetrics>("/admin/metrics"),
  });
}

export interface AdminUserUsage {
  foodLogs: number;
  workouts: number;
  cardioSessions: number;
  checklistCompletions: number;
}

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  username: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  suspendedAt: string | null;
  emailVerified: boolean;
  usage: AdminUserUsage;
}

export function useAdminUsers(q: string, page: number) {
  return useQuery({
    queryKey: ["admin-users", q, page],
    queryFn: () => api.get<{ users: AdminUser[]; total: number; page: number }>(`/admin/users?q=${encodeURIComponent(q)}&page=${page}`),
  });
}

export interface AdminUserDetail {
  user: AdminUser;
  oauthIdentities: { provider: "google" | "apple"; linkedAt: string }[];
  auditLog: { id: number; action: string; adminDisplayName: string; details: string | null; createdAt: string }[];
}

export function useAdminUser(id: number | undefined) {
  return useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`),
    enabled: id != null,
  });
}

function invalidateAdminUsers(queryClient: ReturnType<typeof useQueryClient>, id: number) {
  queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/suspend`),
    onSuccess: (_data, id) => invalidateAdminUsers(queryClient, id),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/reactivate`),
    onSuccess: (_data, id) => invalidateAdminUsers(queryClient, id),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useImpersonateUser() {
  return useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/impersonate`),
  });
}

export interface ModerationPhoto {
  type: "post" | "progress_photo";
  id: number;
  imageUrl: string;
  userId: number;
  displayName: string;
  createdAt: string;
}

export function useModerationQueue() {
  return useQuery({
    queryKey: ["admin-moderation"],
    queryFn: () => api.get<{ photos: ModerationPhoto[] }>("/admin/moderation").then((r) => r.photos),
  });
}

export function useRemoveModeratedPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: "post" | "progress_photo"; id: number }) => api.post(`/admin/moderation/${type}/${id}/remove`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-moderation"] }),
  });
}
