import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { useAuth } from "../../context/AuthContext";

export interface ProgramDay {
  weekday: number;
  schemaId: number | null;
  schemaName: string | null;
}

export interface Program {
  id: number;
  name: string;
  updatedAt: string;
  days: ProgramDay[];
}

export function usePrograms() {
  return useQuery({
    queryKey: ["programs"],
    queryFn: () => api.get<{ programs: Program[] }>("/programs").then((r) => r.programs),
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<{ program: Program }>("/programs", { name }).then((r) => r.program),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programs"] }),
  });
}

export function useSetProgramDays(programId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (days: { weekday: number; schemaId: number | null }[]) =>
      api.put<{ program: Program }>(`/programs/${programId}/days`, { days }).then((r) => r.program),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programs"] }),
  });
}

export function useActivateProgram() {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: (programId: number) => api.post(`/programs/${programId}/activate`),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["workouts-today"] });
      await refresh();
    },
  });
}

export function useDeactivateProgram() {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: () => api.post("/programs/deactivate"),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["workouts-today"] });
      await refresh();
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/programs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programs"] }),
  });
}

export function useTodaysWorkout() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["workouts-today"],
    queryFn: () => api.get<{ today: { schemaId: number; schemaName: string } | null }>("/workouts/today").then((r) => r.today),
    enabled: user?.activeProgramId != null,
  });
}
