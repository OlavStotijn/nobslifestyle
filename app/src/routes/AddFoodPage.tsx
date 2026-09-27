import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useAddFavoriteFood,
  useBarcodeLookup,
  useCreateFoodItem,
  useCreateFoodLog,
  useDeleteSavedMeal,
  useFavoriteFoods,
  useLogSavedMeal,
  useRecentFoods,
  useRemoveFavoriteFood,
  useSavedMeals,
  useScanLabel,
  useSearchFood,
  todayLocalDate,
  type FoodItem,
  type FoodLogSource,
  type OcrResult,
} from "../api/hooks/useFoodLogs";
import { CameraCapture } from "../components/CameraCapture";
import { useDebounced } from "../hooks/useDebounced";
import { amountPresets } from "../lib/foodAmounts";

// @zxing/library is ~450KB minified — only the Scan tab needs it, so it's
// lazy-loaded instead of bloating every page's initial bundle.
const BarcodeScanner = lazy(() => import("../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner })));

type Tab = "quick" | "search" | "scan" | "photo";

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "search", label: "Search" },
    { key: "quick", label: "Quick" },
    { key: "scan", label: "Scan" },
    { key: "photo", label: "Photo" },
  ];
  return (
    <div className="mt-4 flex gap-2 rounded-xl bg-surface-2 p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            tab === t.key ? "bg-accent text-white" : "text-ink-muted"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SearchResultRow({ item, onSelect }: { item: FoodItem; onSelect: (item: FoodItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{item.name}</p>
        {item.brand && <p className="truncate text-sm text-ink-muted">{item.brand}</p>}
      </div>
      <span className="ml-3 shrink-0 text-sm text-ink-muted">{Math.round(item.caloriesPer100g)} kcal/100g</span>
    </button>
  );
}

function QuickTab({ onSelect, onLoggedSavedMeal }: { onSelect: (item: FoodItem) => void; onLoggedSavedMeal: () => void }) {
  const navigate = useNavigate();
  const { data: favorites, isLoading: favoritesLoading } = useFavoriteFoods();
  const { data: recent, isLoading: recentLoading } = useRecentFoods();
  const { data: savedMeals, isLoading: mealsLoading } = useSavedMeals();
  const date = todayLocalDate();
  const logSavedMeal = useLogSavedMeal(date);
  const deleteSavedMeal = useDeleteSavedMeal();

  const loading = favoritesLoading || recentLoading || mealsLoading;

  return (
    <div className="mt-4 flex flex-1 flex-col gap-6 overflow-y-auto">
      {loading && <p className="text-ink-muted">Loading…</p>}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Saved meals</h2>
          <button type="button" onClick={() => navigate("/food/meals/new")} className="text-xs font-semibold text-accent">
            + New meal
          </button>
        </div>
        {!loading && !savedMeals?.length && (
          <p className="mt-2 text-sm text-ink-muted">
            Build a meal you eat often — like yoghurt with chia seeds — and log the whole thing in one tap.
          </p>
        )}
        {savedMeals && savedMeals.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {savedMeals.map((meal) => (
              <div key={meal.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
                <button
                  type="button"
                  disabled={logSavedMeal.isPending}
                  onClick={async () => {
                    await logSavedMeal.mutateAsync(meal.id);
                    onLoggedSavedMeal();
                  }}
                  className="flex min-w-0 flex-1 items-center justify-between text-left disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{meal.name}</p>
                    <p className="text-sm text-ink-muted">{meal.items.length} items</p>
                  </div>
                  <span className="ml-3 shrink-0 text-sm font-semibold text-accent">Log all</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedMeal.mutate(meal.id)}
                  aria-label={`Delete ${meal.name}`}
                  className="shrink-0 px-1 text-ink-muted hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && !favorites?.length && !recent?.length && (
        <p className="text-ink-muted">Log a few things and they'll show up here for quick re-adding.</p>
      )}

      {favorites && favorites.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Favorites</h2>
          <div className="mt-2 flex flex-col gap-2">
            {favorites.map((item) => (
              <SearchResultRow key={item.id} item={item} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}

      {recent && recent.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Recent</h2>
          <div className="mt-2 flex flex-col gap-2">
            {recent.map((item) => (
              <SearchResultRow key={item.id} item={item} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchTab({ onSelect }: { onSelect: (item: FoodItem) => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 350);
  const { data: results, isFetching } = useSearchFood(debouncedQuery);

  return (
    <div className="flex flex-1 flex-col">
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a food…"
        className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
      />
      <div className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
        {isFetching && <p className="text-ink-muted">Searching…</p>}
        {!isFetching && debouncedQuery.trim().length > 1 && results?.length === 0 && (
          <p className="text-ink-muted">No results. Try a different search.</p>
        )}
        {results?.map((item) => (
          <SearchResultRow key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function ScanTab({ onSelect }: { onSelect: (item: FoodItem) => void }) {
  const lookup = useBarcodeLookup();
  const [notFound, setNotFound] = useState(false);

  async function handleDetected(code: string) {
    setNotFound(false);
    try {
      const item = await lookup.mutateAsync(code);
      onSelect(item);
    } catch {
      setNotFound(true);
    }
  }

  if (lookup.isPending) {
    return <p className="mt-6 text-center text-ink-muted">Looking up product…</p>;
  }

  return (
    <div className="mt-4 flex flex-1 flex-col gap-3">
      <Suspense fallback={<p className="text-center text-ink-muted">Loading scanner…</p>}>
        <BarcodeScanner onDetected={handleDetected} />
      </Suspense>
      <p className="text-center text-sm text-ink-muted">Point the camera at a barcode.</p>
      {notFound && (
        <p className="text-center text-sm text-red-500">
          No product found for that barcode. Try Search or Photo instead.
        </p>
      )}
    </div>
  );
}

function OcrReviewStep({
  initial,
  imageR2Key,
  onBack,
  onAdded,
}: {
  initial: OcrResult;
  imageR2Key: string;
  onBack: () => void;
  onAdded: () => void;
}) {
  const date = todayLocalDate();
  const [name, setName] = useState(initial.name ?? "");
  const [calories, setCalories] = useState(String(initial.caloriesPer100g));
  const [protein, setProtein] = useState(String(initial.proteinPer100g));
  const [carbs, setCarbs] = useState(String(initial.carbsPer100g));
  const [fat, setFat] = useState(String(initial.fatPer100g));
  const [quantity, setQuantity] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const createItem = useCreateFoodItem();
  const createLog = useCreateFoodLog(date);

  async function add() {
    if (!name.trim()) {
      setError("Give this product a name.");
      return;
    }
    setError(null);
    try {
      const item = await createItem.mutateAsync({
        name: name.trim(),
        caloriesPer100g: Number(calories) || 0,
        proteinPer100g: Number(protein) || 0,
        carbsPer100g: Number(carbs) || 0,
        fatPer100g: Number(fat) || 0,
        source: "ocr",
        imageR2Key,
      });
      await createLog.mutateAsync({ foodItemId: item.id, quantityG: quantity, source: "photo_ocr" });
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  const pending = createItem.isPending || createLog.isPending;

  return (
    <div className="flex flex-1 flex-col">
      <button type="button" onClick={onBack} className="self-start text-sm text-ink-muted">
        ← Retake photo
      </button>

      <h1 className="mt-4 text-xl font-bold text-ink">Check the numbers</h1>
      <p className="text-sm text-ink-muted">Label reading isn't perfect — fix anything that looks off.</p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Calories /100g</span>
            <input
              type="number"
              inputMode="decimal"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Protein /100g</span>
            <input
              type="number"
              inputMode="decimal"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Carbs /100g</span>
            <input
              type="number"
              inputMode="decimal"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Fat /100g</span>
            <input
              type="number"
              inputMode="decimal"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Quantity eaten (g)</span>
          <input
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 0)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="mt-2 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add to diary"}
        </button>
      </div>
    </div>
  );
}

function PhotoTab({ onExtracted }: { onExtracted: (result: OcrResult, imageR2Key: string) => void }) {
  const scan = useScanLabel();
  const [error, setError] = useState<string | null>(null);

  async function handleCapture(blob: Blob) {
    setError(null);
    try {
      const { result, imageR2Key } = await scan.mutateAsync(blob);
      onExtracted(result, imageR2Key);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  if (scan.isPending) {
    return <p className="mt-6 text-center text-ink-muted">Reading the label…</p>;
  }

  return (
    <div className="mt-4 flex flex-1 flex-col gap-3">
      <CameraCapture onCapture={handleCapture} />
      <p className="text-center text-sm text-ink-muted">Frame the nutrition facts table, then take the photo.</p>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}

function QuantityStep({ item, source, onBack, onAdded }: { item: FoodItem; source: FoodLogSource; onBack: () => void; onAdded: () => void }) {
  const date = todayLocalDate();
  const [quantity, setQuantity] = useState(item.servingSizeG ?? 100);
  const [quantityText, setQuantityText] = useState(String(item.servingSizeG ?? 100));
  const createMutation = useCreateFoodLog(date);
  const { data: favorites } = useFavoriteFoods();
  const isFavorite = favorites?.some((f) => f.id === item.id) ?? false;
  const addFavorite = useAddFavoriteFood();
  const removeFavorite = useRemoveFavoriteFood();
  const presets = amountPresets(item.servingSizeG);

  function applyQuantity(grams: number) {
    setQuantity(grams);
    setQuantityText(String(grams));
  }

  const factor = quantity / 100;
  const calories = Math.round(item.caloriesPer100g * factor);
  const protein = Math.round(item.proteinPer100g * factor);
  const carbs = Math.round(item.carbsPer100g * factor);
  const fat = Math.round(item.fatPer100g * factor);

  async function add() {
    await createMutation.mutateAsync({ foodItemId: item.id, quantityG: quantity, source });
    onAdded();
  }

  return (
    <div className="flex flex-1 flex-col justify-center">
      <button type="button" onClick={onBack} className="self-start text-sm text-ink-muted">
        ← Back
      </button>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{item.name}</h1>
          {item.brand && <p className="text-ink-muted">{item.brand}</p>}
        </div>
        <button
          type="button"
          onClick={() => (isFavorite ? removeFavorite.mutate(item.id) : addFavorite.mutate(item.id))}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className={`shrink-0 text-2xl ${isFavorite ? "text-accent" : "text-ink-muted"}`}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => applyQuantity(Math.max(1, quantity - 10))}
          className="h-12 w-12 shrink-0 rounded-full border border-border text-xl font-bold text-ink"
        >
          −
        </button>
        <div className="flex items-baseline gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={quantityText}
            onChange={(e) => {
              setQuantityText(e.target.value);
              const n = Number(e.target.value);
              if (n > 0) setQuantity(n);
            }}
            className="w-24 rounded-xl border border-border bg-surface px-2 py-2 text-center text-3xl font-bold text-ink outline-none focus:border-accent"
          />
          <span className="text-sm text-ink-muted">grams</span>
        </div>
        <button
          type="button"
          onClick={() => applyQuantity(quantity + 10)}
          className="h-12 w-12 shrink-0 rounded-full border border-border text-xl font-bold text-ink"
        >
          +
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyQuantity(p.grams)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              quantity === p.grams ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-ink"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-3xl font-bold text-accent">{calories}</p>
        <p className="text-sm text-ink-muted">kcal</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-lg font-semibold text-ink">{protein}g</p>
          <p className="text-xs text-ink-muted">Protein</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-lg font-semibold text-ink">{carbs}g</p>
          <p className="text-xs text-ink-muted">Carbs</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-lg font-semibold text-ink">{fat}g</p>
          <p className="text-xs text-ink-muted">Fat</p>
        </div>
      </div>

      <button
        type="button"
        onClick={add}
        disabled={createMutation.isPending}
        className="mt-8 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {createMutation.isPending ? "Adding…" : "Add to diary"}
      </button>
    </div>
  );
}

export function AddFoodPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("search");
  const [selected, setSelected] = useState<{ item: FoodItem; source: FoodLogSource } | null>(null);
  const [ocrPending, setOcrPending] = useState<{ result: OcrResult; imageR2Key: string } | null>(null);

  if (selected) {
    return (
      <div className="flex min-h-full flex-col bg-bg px-6 py-8">
        <QuantityStep
          item={selected.item}
          source={selected.source}
          onBack={() => setSelected(null)}
          onAdded={() => navigate("/food")}
        />
      </div>
    );
  }

  if (ocrPending) {
    return (
      <div className="flex min-h-full flex-col bg-bg px-6 py-8">
        <OcrReviewStep
          initial={ocrPending.result}
          imageR2Key={ocrPending.imageR2Key}
          onBack={() => setOcrPending(null)}
          onAdded={() => navigate("/food")}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/food")} className="self-start text-sm text-ink-muted">
        ← Cancel
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">Add food</h1>

      <TabBar tab={tab} onChange={setTab} />

      {tab === "quick" && (
        <QuickTab onSelect={(item) => setSelected({ item, source: "search" })} onLoggedSavedMeal={() => navigate("/food")} />
      )}
      {tab === "search" && <SearchTab onSelect={(item) => setSelected({ item, source: "search" })} />}
      {tab === "scan" && <ScanTab onSelect={(item) => setSelected({ item, source: "barcode" })} />}
      {tab === "photo" && <PhotoTab onExtracted={(result, imageR2Key) => setOcrPending({ result, imageR2Key })} />}
    </div>
  );
}
