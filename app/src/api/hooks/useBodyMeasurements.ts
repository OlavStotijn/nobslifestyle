import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface BodyMeasurement {
  id: number;
  loggedDate: string;
  waistCm: number | null;
  chestCm: number | null;
  hipsCm: number | null;
  armsCm: number | null;
  thighsCm: number | null;
  note: string | null;
  createdAt: string;
}

// Pro-only.
export function useBodyMeasurements() {
  return useQuery({
    queryKey: ["body-measurements"],
    queryFn: () => api.get<{ measurements: BodyMeasurement[] }>("/measurements").then((r) => r.measurements),
  });
}

export interface CreateBodyMeasurementInput {
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  armsCm?: number;
  thighsCm?: number;
  note?: string;
}

export function useCreateBodyMeasurement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBodyMeasurementInput) =>
      api.post<{ measurement: BodyMeasurement }>("/measurements", input).then((r) => r.measurement),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["body-measurements"] }),
  });
}

export function useDeleteBodyMeasurement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/measurements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["body-measurements"] }),
  });
}
