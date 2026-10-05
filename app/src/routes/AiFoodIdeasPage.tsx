import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  useCreateFoodItem,
  useCreateFoodLog,
  useGenerateFoodPlan,
  useGenerateRecipe,
  todayLocalDate,
  type GeneratedMeal,
  type GeneratedRecipe,
} from "../api/hooks/useFoodLogs";

type Mode = "menu" | "plan-form" | "plan-results" | "recipe-form" | "recipe-result";

function PlanForm({ onGenerated, onBack }: { onGenerated: (meals: GeneratedMeal[]) => void; onBack: () => void }) {
  const [preference, setPreference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const generate = useGenerateFoodPlan();

  async function submit() {
    setError(null);
    try {
      const meals = await generate.mutateAsync(preference || undefined);
      onGenerated(meals);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start text-sm text-ink-muted">
        ← Back
      </button>
      <h1 className="text-xl font-bold text-ink">Plan my day</h1>
      <p className="text-sm text-ink-muted">Suggests meals that roughly hit your daily targets.</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">Dietary preference (optional)</span>
        <input
          value={preference}
          onChange={(e) => setPreference(e.target.value)}
          placeholder="Vegetarian, high protein, no dairy…"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={generate.isPending}
        className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {generate.isPending ? "Thinking…" : "Generate plan"}
      </button>
    </div>
  );
}

function PlanResults({ meals, onBack }: { meals: GeneratedMeal[]; onBack: () => void }) {
  const navigate = useNavigate();
  const date = todayLocalDate();
  const createItem = useCreateFoodItem();
  const createLog = useCreateFoodLog(date);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function addMeal(meal: GeneratedMeal, index: number) {
    setError(null);
    try {
      const item = await createItem.mutateAsync({
        name: meal.name,
        caloriesPer100g: meal.calories,
        proteinPer100g: meal.protein,
        carbsPer100g: meal.carbs,
        fatPer100g: meal.fat,
        source: "manual",
      });
      await createLog.mutateAsync({ foodItemId: item.id, quantityG: 100, mealType: meal.mealType, source: "manual" });
      setAdded((prev) => new Set(prev).add(index));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that meal.");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-6">
      <button type="button" onClick={onBack} className="self-start text-sm text-ink-muted">
        ← New plan
      </button>
      <h1 className="text-xl font-bold text-ink">Today's suggested plan</h1>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-3">
        {meals.map((meal, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{meal.mealType}</p>
            <p className="mt-1 font-medium text-ink">{meal.name}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {Math.round(meal.calories)} kcal · P{Math.round(meal.protein)}g · C{Math.round(meal.carbs)}g · F
              {Math.round(meal.fat)}g
            </p>
            <button
              type="button"
              onClick={() => addMeal(meal, i)}
              disabled={added.has(i) || createItem.isPending || createLog.isPending}
              className="mt-3 rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent disabled:opacity-50"
            >
              {added.has(i) ? "Added ✓" : "Add to diary"}
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => navigate("/food")} className="mt-2 text-sm text-ink-muted">
        Done — back to Food
      </button>
    </div>
  );
}

function RecipeForm({ onGenerated, onBack }: { onGenerated: (recipe: GeneratedRecipe) => void; onBack: () => void }) {
  const [preference, setPreference] = useState("");
  const [haveIngredients, setHaveIngredients] = useState("");
  const [maxMinutes, setMaxMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const generate = useGenerateRecipe();

  async function submit() {
    setError(null);
    try {
      const recipe = await generate.mutateAsync({
        preference: preference || undefined,
        haveIngredients: haveIngredients || undefined,
        maxMinutes: maxMinutes ? Number(maxMinutes) : undefined,
      });
      onGenerated(recipe);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start text-sm text-ink-muted">
        ← Back
      </button>
      <h1 className="text-xl font-bold text-ink">Dinner recipe ideas</h1>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">Preference (optional)</span>
        <input
          value={preference}
          onChange={(e) => setPreference(e.target.value)}
          placeholder="Vegetarian, low carb, spicy…"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">What you already have (optional)</span>
        <input
          value={haveIngredients}
          onChange={(e) => setHaveIngredients(e.target.value)}
          placeholder="Chicken, rice, broccoli…"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">Time limit in minutes (optional)</span>
        <input
          type="number"
          inputMode="numeric"
          value={maxMinutes}
          onChange={(e) => setMaxMinutes(e.target.value)}
          placeholder="30"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={generate.isPending}
        className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {generate.isPending ? "Thinking…" : "Generate recipe"}
      </button>
    </div>
  );
}

function RecipeResult({ recipe, onBack }: { recipe: GeneratedRecipe; onBack: () => void }) {
  const navigate = useNavigate();
  const date = todayLocalDate();
  const createItem = useCreateFoodItem();
  const createLog = useCreateFoodLog(date);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logAsMeal() {
    setError(null);
    try {
      const item = await createItem.mutateAsync({
        name: recipe.title,
        caloriesPer100g: recipe.calories,
        proteinPer100g: recipe.protein,
        carbsPer100g: recipe.carbs,
        fatPer100g: recipe.fat,
        source: "manual",
      });
      await createLog.mutateAsync({ foodItemId: item.id, quantityG: 100, mealType: "dinner", source: "manual" });
      setAdded(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that meal.");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-6">
      <button type="button" onClick={onBack} className="self-start text-sm text-ink-muted">
        ← New recipe
      </button>
      <h1 className="text-xl font-bold text-ink">{recipe.title}</h1>
      <p className="text-sm text-ink-muted">
        {Math.round(recipe.calories)} kcal · P{Math.round(recipe.protein)}g · C{Math.round(recipe.carbs)}g · F
        {Math.round(recipe.fat)}g per serving
      </p>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Ingredients</h2>
        <ul className="mt-2 flex flex-col gap-1">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="text-sm text-ink">
              • {ing}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Steps</h2>
        <ol className="mt-2 flex flex-col gap-2">
          {recipe.steps.map((step, i) => (
            <li key={i} className="text-sm text-ink">
              {i + 1}. {step}
            </li>
          ))}
        </ol>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={logAsMeal}
        disabled={added || createItem.isPending || createLog.isPending}
        className="rounded-xl border border-accent px-4 py-3 font-semibold text-accent disabled:opacity-50"
      >
        {added ? "Added to diary ✓" : "Log this as dinner"}
      </button>
      <button type="button" onClick={() => navigate("/food")} className="text-sm text-ink-muted">
        Done — back to Food
      </button>
    </div>
  );
}

export function AiFoodIdeasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("menu");
  const [plan, setPlan] = useState<GeneratedMeal[]>([]);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);

  if (user?.isPro !== true) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-bg px-6 py-8 text-center">
        <p className="text-2xl">✨</p>
        <h1 className="text-lg font-bold text-ink">AI food ideas are a Pro feature</h1>
        <p className="text-sm text-ink-muted">Get a daily meal plan tailored to your targets, or dinner recipe ideas from what you have.</p>
        <Link to="/profile/plan" className="mt-2 rounded-xl bg-accent px-4 py-3 font-semibold text-white">
          See Pro features
        </Link>
        <button type="button" onClick={() => navigate("/food")} className="mt-2 text-sm text-ink-muted">
          ← Back to Food
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      {mode === "menu" && (
        <div className="flex flex-1 flex-col gap-4">
          <button type="button" onClick={() => navigate("/food")} className="self-start text-sm text-ink-muted">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-ink">AI ideas</h1>
          <button
            type="button"
            onClick={() => setMode("plan-form")}
            className="flex flex-col items-start gap-1 rounded-xl border border-border bg-surface p-4 text-left"
          >
            <span className="font-semibold text-ink">Plan my day</span>
            <span className="text-sm text-ink-muted">A full day of meals that roughly hit your targets.</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("recipe-form")}
            className="flex flex-col items-start gap-1 rounded-xl border border-border bg-surface p-4 text-left"
          >
            <span className="font-semibold text-ink">Dinner recipe ideas</span>
            <span className="text-sm text-ink-muted">A recipe from what you have, or just a preference.</span>
          </button>
        </div>
      )}
      {mode === "plan-form" && (
        <PlanForm
          onGenerated={(meals) => {
            setPlan(meals);
            setMode("plan-results");
          }}
          onBack={() => setMode("menu")}
        />
      )}
      {mode === "plan-results" && <PlanResults meals={plan} onBack={() => setMode("plan-form")} />}
      {mode === "recipe-form" && (
        <RecipeForm
          onGenerated={(r) => {
            setRecipe(r);
            setMode("recipe-result");
          }}
          onBack={() => setMode("menu")}
        />
      )}
      {mode === "recipe-result" && recipe && <RecipeResult recipe={recipe} onBack={() => setMode("recipe-form")} />}
    </div>
  );
}
