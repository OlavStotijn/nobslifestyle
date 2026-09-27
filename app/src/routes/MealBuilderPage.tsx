import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useCreateSavedMeal, useFavoriteFoods, useRecentFoods, useSearchFood, type FoodItem } from "../api/hooks/useFoodLogs";
import { useDebounced } from "../hooks/useDebounced";
import { amountPresets } from "../lib/foodAmounts";

interface DraftItem {
  item: FoodItem;
  quantityG: number;
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

function AddItemSheet({ item, onAdd, onCancel }: { item: FoodItem; onAdd: (quantityG: number) => void; onCancel: () => void }) {
  const [quantity, setQuantity] = useState(item.servingSizeG ?? 100);
  const presets = amountPresets(item.servingSizeG);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-6 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-2" />
        <h2 className="text-lg font-bold text-ink">{item.name}</h2>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 10))}
            className="h-12 w-12 shrink-0 rounded-full border border-border text-xl font-bold text-ink"
          >
            −
          </button>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              className="w-24 rounded-xl border border-border bg-bg px-2 py-2 text-center text-3xl font-bold text-ink outline-none focus:border-accent"
            />
            <span className="text-sm text-ink-muted">grams</span>
          </div>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 10)}
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
              onClick={() => setQuantity(p.grams)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                quantity === p.grams ? "border-accent bg-accent-soft text-accent" : "border-border bg-bg text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => quantity > 0 && onAdd(quantity)}
          disabled={quantity <= 0}
          className="mt-6 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          Add to meal
        </button>
      </div>
    </div>
  );
}

export function MealBuilderPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [picking, setPicking] = useState<FoodItem | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounced(query, 350);
  const { data: results, isFetching } = useSearchFood(debouncedQuery);
  const { data: favorites } = useFavoriteFoods();
  const { data: recent } = useRecentFoods();
  const createSavedMeal = useCreateSavedMeal();

  const showingSearch = debouncedQuery.trim().length > 1;
  const suggestions = showingSearch ? results : [...(favorites ?? []), ...(recent ?? [])].slice(0, 10);

  function addDraftItem(item: FoodItem, quantityG: number) {
    setDraft((d) => [...d, { item, quantityG }]);
    setPicking(null);
    setQuery("");
  }

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Give this meal a name.");
      return;
    }
    if (draft.length === 0) {
      setError("Add at least one item.");
      return;
    }
    try {
      await createSavedMeal.mutateAsync({
        name: name.trim(),
        items: draft.map((d) => ({ foodItemId: d.item.id, quantityG: d.quantityG })),
      });
      navigate("/food/add");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate(-1)} className="self-start text-sm text-ink-muted">
        ← Cancel
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">New meal</h1>
      <p className="text-sm text-ink-muted">Build it once, log the whole thing in one tap from now on.</p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Morning yoghurt & chia"
        className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
      />

      {draft.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {draft.map((d, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{d.item.name}</p>
                <p className="text-sm text-ink-muted">{d.quantityG}g</p>
              </div>
              <button
                type="button"
                onClick={() => setDraft((cur) => cur.filter((_, idx) => idx !== i))}
                className="ml-3 shrink-0 text-sm text-ink-muted hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search foods to add…"
        className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
      />

      <div className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto">
        {isFetching && <p className="text-ink-muted">Searching…</p>}
        {suggestions?.map((item) => (
          <SearchResultRow key={item.id} item={item} onSelect={setPicking} />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={createSavedMeal.isPending}
        className="mt-4 rounded-xl bg-accent px-4 py-3 text-center font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {createSavedMeal.isPending ? "Saving…" : "Save meal"}
      </button>

      {picking && <AddItemSheet item={picking} onAdd={(q) => addDraftItem(picking, q)} onCancel={() => setPicking(null)} />}
    </div>
  );
}
