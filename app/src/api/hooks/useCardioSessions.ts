import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { todayLocalDate } from "./useFoodLogs";
import type { RoutePoint } from "../../lib/geo";

export type ActivityType = "running" | "cycling";

export interface CardioSession {
  id: number;
  activityType: ActivityType;
  startedAt: string;
  finishedAt: string | null;
  distanceM: number;
  durationS: number;
  calories: number;
  route: RoutePoint[] | null;
  subtractFromIntake: boolean;
  rating: number | null;
  notes: string | null;
}

export function useCardioSessionsForDate(date: string) {
  return useQuery({
    queryKey: ["cardio-sessions", date],
    queryFn: () => api.get<{ sessions: CardioSession[] }>(`/cardio-sessions?date=${date}`).then((r) => r.sessions),
  });
}

export function useCardioSession(id: number | undefined) {
  return useQuery({
    queryKey: ["cardio-session", id],
    queryFn: () => api.get<{ session: CardioSession }>(`/cardio-sessions/${id}`).then((r) => r.session),
    enabled: id != null,
  });
}

interface CreateCardioSessionInput {
  activityType: ActivityType;
  startedAt: string;
  finishedAt: string;
  distanceM: number;
  durationS: number;
  route?: RoutePoint[];
  subtractFromIntake: boolean;
}

export function useCreateCardioSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardioSessionInput) =>
      api.post<{ session: CardioSession }>("/cardio-sessions", input).then((r) => r.session),
    onSuccess: () => {
      const today = todayLocalDate();
      queryClient.invalidateQueries({ queryKey: ["cardio-sessions", today] });
      queryClient.invalidateQueries({ queryKey: ["food-summary", today] });
    },
  });
}

export function useUpdateCardioSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; subtractFromIntake?: boolean; rating?: number; notes?: string }) =>
      api.patch<{ session: CardioSession }>(`/cardio-sessions/${id}`, input).then((r) => r.session),
    onSuccess: (session) => {
      queryClient.setQueryData(["cardio-session", session.id], session);
      const today = todayLocalDate();
      queryClient.invalidateQueries({ queryKey: ["cardio-sessions", today] });
      queryClient.invalidateQueries({ queryKey: ["food-summary", today] });
    },
  });
}
