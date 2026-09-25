import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface SessionSet {
  id: number;
  setNumber: number;
  reps: number;
  weightKg: number;
  weightChangeApplied: "none" | "session_only" | "permanent";
}

export interface SessionExercise {
  id: number;
  exerciseId: number;
  exerciseName: string;
  sortOrder: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeightKg: number;
  sets: SessionSet[];
}

export type Badge = "pr" | "progress" | "on_target" | "regression";

export interface ProgressBadgeInfo {
  exerciseId: number;
  exerciseName: string;
  bestSet: { reps: number; weightKg: number };
  weightDeltaBaseline: number;
  repsDeltaBaseline: number;
  setsDeltaBaseline: number;
  weightDeltaPrev: number | null;
  repsDeltaPrev: number | null;
  volumeDeltaPrev: number | null;
  isPr: boolean;
  badge: Badge;
}

export interface SessionSummary {
  id: number;
  schemaId: number;
  schemaName: string;
  startedAt: string;
  finishedAt: string | null;
  rating: number | null;
  notes: string | null;
  progressSummary: { perExercise: ProgressBadgeInfo[]; sessionBadge: Badge } | null;
}

export interface SessionDetail extends SessionSummary {
  exercises: SessionExercise[];
}

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<{ sessions: SessionSummary[] }>("/sessions").then((r) => r.sessions),
  });
}

export function useSession(id: number | undefined) {
  return useQuery({
    queryKey: ["session", id],
    queryFn: () => api.get<{ session: SessionDetail }>(`/sessions/${id}`).then((r) => r.session),
    enabled: id != null,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (schemaId: number) => api.post<{ session: SessionDetail }>("/sessions", { schemaId }).then((r) => r.session),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useAddSet(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionExerciseId, reps, weightKg }: { sessionExerciseId: number; reps: number; weightKg: number }) =>
      api.post(`/sessions/${sessionId}/exercises/${sessionExerciseId}/sets`, { reps, weightKg }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
  });
}

export function useDeleteSet(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setId: number) => api.delete(`/sessions/${sessionId}/sets/${setId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
  });
}

export function useApplyWeight(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionExerciseId, permanent }: { sessionExerciseId: number; permanent: boolean }) =>
      api.post(`/sessions/${sessionId}/exercises/${sessionExerciseId}/apply-weight`, { permanent }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
  });
}

export function useFinishSession(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating?: number; notes?: string }) =>
      api.post<{ session: SessionDetail }>(`/sessions/${sessionId}/finish`, input).then((r) => r.session),
    onSuccess: (session) => {
      queryClient.setQueryData(["session", sessionId], session);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useSaveSessionAsSchema(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<{ schemaId: number }>(`/sessions/${sessionId}/save-as-schema`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schemas"] }),
  });
}
