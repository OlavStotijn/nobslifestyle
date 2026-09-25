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

export function useFavoriteFoods() {
  return useQuery({
    queryKey: ["food-favorites"],
    queryFn: () => api.get<{ items: FoodItem[] }>("/food/favorites").then((r) => r.items),
  });
}

export function useRecentFoods() {
  return useQuery({
    queryKey: ["food-recent"],
    queryFn: () => api.get<{ items: FoodItem[] }>("/food/recent").then((r) => r.items),
  });
}

export function useAddFavoriteFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foodItemId: number) => api.post(`/food/favorites/${foodItemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food-favorites"] }),
  });
}

export function useRemoveFavoriteFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foodItemId: number) => api.delete(`/food/favorites/${foodItemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food-favorites"] }),
  });
}

export interface SavedMealItem {
  id: number;
  foodItemId: number;
  foodItemName: string;
  quantityG: number;
}

export interface SavedMeal {
  id: number;
  name: string;
  items: SavedMealItem[];
}

export function useSavedMeals() {
  return useQuery({
    queryKey: ["saved-meals"],
    queryFn: () => api.get<{ meals: SavedMeal[] }>("/food/saved-meals").then((r) => r.meals),
  });
}

export function useCreateSavedMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; items: { foodItemId: number; quantityG: number }[] }) =>
      api.post<{ meal: SavedMeal }>("/food/saved-meals", input).then((r) => r.meal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-meals"] }),
  });
}

export function useDeleteSavedMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/food/saved-meals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-meals"] }),
  });
}

export function useLogSavedMeal(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ logs: FoodLog[] }>(`/food/saved-meals/${id}/log`).then((r) => r.logs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-logs", date] });
      queryClient.invalidateQueries({ queryKey: ["food-summary", date] });
    },
  });
}
