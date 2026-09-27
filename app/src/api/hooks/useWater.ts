import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface WaterLog {
  id: number;
  amountMl: number;
  loggedAt: string;
}

export interface WaterSettings {
  goalMl: number;
  remindersEnabled: boolean;
  reminderIntervalMinutes: number;
  reminderStartTime: string;
  reminderEndTime: string;
}

export function useWaterLogs(date: string) {
  return useQuery({
    queryKey: ["water-logs", date],
    queryFn: () => api.get<{ logs: WaterLog[] }>(`/water/logs?date=${date}`).then((r) => r.logs),
  });
}

export function useWaterSettings() {
  return useQuery({
    queryKey: ["water-settings"],
    queryFn: () => api.get<{ settings: WaterSettings }>("/water/settings").then((r) => r.settings),
  });
}

export function useUpdateWaterSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<WaterSettings>) => api.put<{ settings: WaterSettings }>("/water/settings", input).then((r) => r.settings),
    onSuccess: (settings) => queryClient.setQueryData(["water-settings"], settings),
  });
}

export function useCreateWaterLog(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountMl: number) => api.post<{ log: WaterLog }>("/water/logs", { amountMl }).then((r) => r.log),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["water-logs", date] }),
  });
}

export function useDeleteWaterLog(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/water/logs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["water-logs", date] }),
  });
}
