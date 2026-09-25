import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodLogSource = "search" | "barcode" | "photo_ocr" | "manual" | "quick_repeat";

export interface FoodItem {
  id: number;
  barcode: string | null;
  name: string;
  brand: string | null;
  source: "off" | "manual" | "ocr" | "user";
  servingSizeG: number | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  imageUrl: string | null;
}

export interface FoodLog {
  id: number;
  foodItemId: number;
  foodItemName: string;
  foodItemBrand: string | null;
  foodItemImageUrl: string | null;
  quantityG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  mealTypeAuto: boolean;
  loggedAt: string;
  source: FoodLogSource;
}

export interface DailySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  burnedKcal: number;
}

export function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useFoodLogs(date: string) {
  return useQuery({
    queryKey: ["food-logs", date],
    queryFn: () => api.get<{ logs: FoodLog[] }>(`/food/logs?date=${date}`).then((r) => r.logs),
  });
}

export function useDailySummary(date: string) {
  return useQuery({
    queryKey: ["food-summary", date],
    queryFn: () => api.get<{ summary: DailySummary }>(`/food/logs/summary?date=${date}`).then((r) => r.summary),
  });
}

export function useSearchFood(query: string) {
  return useQuery({
    queryKey: ["food-search", query],
    queryFn: () => api.get<{ items: FoodItem[] }>(`/food/search?q=${encodeURIComponent(query)}`).then((r) => r.items),
    enabled: query.trim().length > 1,
    staleTime: 60_000,
  });
}

export function useBarcodeLookup() {
  return useMutation({
    mutationFn: (code: string) => api.get<{ item: FoodItem }>(`/food/barcode/${encodeURIComponent(code)}`).then((r) => r.item),
  });
}

export interface OcrResult {
  name: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export function useScanLabel() {
  return useMutation({
    mutationFn: (photo: Blob) => {
      const form = new FormData();
      form.append("image", photo, "label.jpg");
      return api.postForm<{ result: OcrResult; imageR2Key: string }>("/food/ocr", form);
    },
  });
}

interface CreateFoodItemInput {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source?: "manual" | "ocr";
  imageR2Key?: string;
}

export function useCreateFoodItem() {
  return useMutation({
    mutationFn: (input: CreateFoodItemInput) => api.post<{ item: FoodItem }>("/food/items", input).then((r) => r.item),
  });
}

interface CreateFoodLogInput {
  foodItemId: number;
  quantityG: number;
  mealType?: MealType;
  source: FoodLogSource;
}

export function useCreateFoodLog(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFoodLogInput) => api.post<{ log: FoodLog }>("/food/logs", input).then((r) => r.log),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-logs", date] });
      queryClient.invalidateQueries({ queryKey: ["food-summary", date] });
    },
  });
}

export function useDeleteFoodLog(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/food/logs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-logs", date] });
      queryClient.invalidateQueries({ queryKey: ["food-summary", date] });
    },
  });
}
