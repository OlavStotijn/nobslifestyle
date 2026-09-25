import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface WeightLog {
  id: number;
  weightKg: number;
  loggedDate: string;
  note: string | null;
  createdAt: string;
}

export function useWeightLogs() {
  return useQuery({
    queryKey: ["weight-logs"],
    queryFn: () => api.get<{ logs: WeightLog[] }>("/weight-logs").then((r) => r.logs),
  });
}

export function useCreateWeightLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { weightKg: number; note?: string }) =>
      api.post<{ log: WeightLog }>("/weight-logs", input).then((r) => r.log),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weight-logs"] }),
  });
}

export function useDeleteWeightLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/weight-logs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weight-logs"] }),
  });
}

export interface PersonalRecord {
  exerciseId: number;
  exerciseName: string;
  bestWeightKg: number;
  bestReps: number;
  achievedAt: string;
  sessionId: number;
}

export function usePersonalRecords() {
  return useQuery({
    queryKey: ["progress", "prs"],
    queryFn: () => api.get<{ records: PersonalRecord[] }>("/progress/prs").then((r) => r.records),
  });
}

export interface ExerciseHistoryPoint {
  sessionId: number;
  startedAt: string;
  bestWeightKg: number;
  bestReps: number;
  volumeKg: number;
}

export function useExerciseHistory(exerciseId: number | undefined) {
  return useQuery({
    queryKey: ["progress", "exercise-history", exerciseId],
    queryFn: () => api.get<{ history: ExerciseHistoryPoint[] }>(`/progress/exercise/${exerciseId}/history`).then((r) => r.history),
    enabled: exerciseId != null,
  });
}

export interface Streaks {
  loggingStreakDays: number;
  workoutStreakDays: number;
}

export function useStreaks() {
  return useQuery({
    queryKey: ["streaks"],
    queryFn: () => api.get<Streaks>("/streaks"),
  });
}
