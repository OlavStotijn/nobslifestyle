import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface Exercise {
  id: number;
  name: string;
  category: string | null;
  equipment: string | null;
  isCustom: boolean;
  imageUrl: string | null;
}

export interface SchemaExercise {
  id: number;
  exerciseId: number;
  exerciseName: string;
  category: string | null;
  sortOrder: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeightKg: number;
  notes: string | null;
}

export type SchemaVisibility = "private" | "friends";

export interface SchemaSummary {
  id: number;
  name: string;
  description: string | null;
  visibility: SchemaVisibility;
  updatedAt: string;
}

export interface SchemaDetail extends SchemaSummary {
  exercises: SchemaExercise[];
}

export function useExerciseSearch(query: string) {
  return useQuery({
    queryKey: ["exercises", query],
    queryFn: () => api.get<{ exercises: Exercise[] }>(`/exercises?q=${encodeURIComponent(query)}`).then((r) => r.exercises),
    staleTime: 60_000,
  });
}

export function useSchemas() {
  return useQuery({
    queryKey: ["schemas"],
    queryFn: () => api.get<{ schemas: SchemaSummary[] }>("/schemas").then((r) => r.schemas),
  });
}

export function useSchema(id: number | undefined) {
  return useQuery({
    queryKey: ["schema", id],
    queryFn: () => api.get<{ schema: SchemaDetail }>(`/schemas/${id}`).then((r) => r.schema),
    enabled: id != null,
  });
}

export function useCreateSchema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      api.post<{ schema: SchemaDetail }>("/schemas", input).then((r) => r.schema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schemas"] }),
  });
}

export function useUpdateSchemaVisibility(schemaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visibility: SchemaVisibility) => api.put<{ schema: SchemaDetail }>(`/schemas/${schemaId}`, { visibility }).then((r) => r.schema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schema", schemaId] });
      queryClient.invalidateQueries({ queryKey: ["schemas"] });
    },
  });
}

export function useFriendSchemas(friendUserId: number | undefined) {
  return useQuery({
    queryKey: ["schemas", "friend", friendUserId],
    queryFn: () => api.get<{ schemas: SchemaDetail[] }>(`/schemas/friend/${friendUserId}`).then((r) => r.schemas),
    enabled: friendUserId != null,
  });
}

export function useCopySchema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (schemaId: number) => api.post<{ schema: SchemaDetail }>(`/schemas/${schemaId}/copy`).then((r) => r.schema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schemas"] }),
  });
}

interface AddSchemaExerciseInput {
  exerciseId: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeightKg: number;
}

export function useAddSchemaExercise(schemaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddSchemaExerciseInput) => api.post(`/schemas/${schemaId}/exercises`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schema", schemaId] }),
  });
}

export function useUpdateSchemaExercise(schemaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, ...input }: { rowId: number } & Partial<AddSchemaExerciseInput>) =>
      api.put(`/schemas/${schemaId}/exercises/${rowId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schema", schemaId] }),
  });
}

export function useDeleteSchemaExercise(schemaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rowId: number) => api.delete(`/schemas/${schemaId}/exercises/${rowId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schema", schemaId] }),
  });
}
