import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

export interface NutritionProfile {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  timezone: string;
  mealWindows: { breakfastEnd: string; lunchEnd: string; dinnerEnd: string };
  onboardingCompletedAt: string | null;
}

export interface NutritionProfileInput {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

const QUERY_KEY = ["nutrition-profile"];

export function useNutritionProfile() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<{ profile: NutritionProfile | null }>("/nutrition-profile").then((r) => r.profile),
  });
}

export function useSaveNutritionProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NutritionProfileInput) =>
      api.put<{ profile: NutritionProfile }>("/nutrition-profile", input).then((r) => r.profile),
    onSuccess: (profile) => queryClient.setQueryData(QUERY_KEY, profile),
  });
}
