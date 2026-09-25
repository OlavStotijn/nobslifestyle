import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useSaveNutritionProfile,
  type ActivityLevel,
  type Goal,
  type NutritionProfile,
  type Sex,
} from "../api/hooks/useNutritionProfile";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";

type Step = "sex" | "birthDate" | "height" | "weight" | "activity" | "goal" | "summary";
const STEP_ORDER: Step[] = ["sex", "birthDate", "height", "weight", "activity", "goal", "summary"];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Desk job, little to no exercise" },
  { value: "light", label: "Light", hint: "Light exercise 1–3 days/week" },
  { value: "moderate", label: "Moderate", hint: "Moderate exercise 3–5 days/week" },
  { value: "active", label: "Active", hint: "Hard exercise 6–7 days/week" },
  { value: "very_active", label: "Very active", hint: "Athlete-level training" },
];

const GOAL_OPTIONS: { value: Goal; label: string; hint: string }[] = [
  { value: "lose", label: "Lose weight", hint: "~500 kcal/day deficit" },
  { value: "maintain", label: "Maintain", hint: "Stay at current weight" },
  { value: "gain", label: "Gain weight", hint: "~350 kcal/day surplus" },
];

function ChoiceCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-5 py-4 text-left transition-colors ${
        selected ? "border-accent bg-accent-soft" : "border-border bg-surface"
      }`}
    >
      {children}
    </button>
  );
}

function StepShell({
  title,
  subtitle,
  children,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-ink-muted">{subtitle}</p>}
      <div className="mt-6 flex flex-col gap-3">{children}</div>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="mt-8 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEP_ORDER[stepIndex];

  const [sex, setSex] = useState<Sex | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [result, setResult] = useState<NutritionProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useSaveNutritionProfile();

  if (!user?.emailVerified) {
    return <Navigate to="/verify-email-required" replace />;
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  }

  async function submit() {
    if (!sex || !activityLevel || !goal) return;
    setError(null);
    try {
      const profile = await saveMutation.mutateAsync({
        sex,
        birthDate,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        activityLevel,
        goal,
      });
      setResult(profile);
      goNext();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {STEP_ORDER.slice(0, -1).map((s, i) => (
            <span
              key={s}
              className={`h-1.5 w-6 rounded-full transition-colors ${i <= stepIndex ? "bg-accent" : "bg-surface-2"}`}
            />
          ))}
        </div>
        <ThemeToggle />
      </div>

      {step === "sex" && (
        <StepShell title="Let's set up your targets" subtitle="First, your sex." onNext={goNext} nextDisabled={!sex}>
          <ChoiceCard selected={sex === "male"} onClick={() => setSex("male")}>
            <span className="font-medium text-ink">Male</span>
          </ChoiceCard>
          <ChoiceCard selected={sex === "female"} onClick={() => setSex("female")}>
            <span className="font-medium text-ink">Female</span>
          </ChoiceCard>
        </StepShell>
      )}

      {step === "birthDate" && (
        <StepShell title="When were you born?" onNext={goNext} nextDisabled={!birthDate}>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </StepShell>
      )}

      {step === "height" && (
        <StepShell title="How tall are you?" onNext={goNext} nextDisabled={!heightCm}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="180"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
            <span className="text-ink-muted">cm</span>
          </div>
        </StepShell>
      )}

      {step === "weight" && (
        <StepShell title="What's your current weight?" onNext={goNext} nextDisabled={!weightKg}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="75"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
            <span className="text-ink-muted">kg</span>
          </div>
        </StepShell>
      )}

      {step === "activity" && (
        <StepShell title="How much do you move?" onNext={goNext} nextDisabled={!activityLevel}>
          {ACTIVITY_OPTIONS.map((opt) => (
            <ChoiceCard key={opt.value} selected={activityLevel === opt.value} onClick={() => setActivityLevel(opt.value)}>
              <span className="font-medium text-ink">{opt.label}</span>
              <p className="text-sm text-ink-muted">{opt.hint}</p>
            </ChoiceCard>
          ))}
        </StepShell>
      )}

      {step === "goal" && (
        <StepShell title="What's your goal?" onNext={submit} nextDisabled={!goal} nextLabel={saveMutation.isPending ? "Calculating…" : "See my targets"}>
          {GOAL_OPTIONS.map((opt) => (
            <ChoiceCard key={opt.value} selected={goal === opt.value} onClick={() => setGoal(opt.value)}>
              <span className="font-medium text-ink">{opt.label}</span>
              <p className="text-sm text-ink-muted">{opt.hint}</p>
            </ChoiceCard>
          ))}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </StepShell>
      )}

      {step === "summary" && result && (
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-2xl font-bold text-ink">Here's your daily target</h1>
          <p className="mt-1 text-ink-muted">You can fine-tune this later in your profile.</p>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="text-4xl font-bold text-accent">{result.targetKcal}</p>
            <p className="text-sm text-ink-muted">kcal / day</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface-2 p-3 text-center">
              <p className="text-lg font-semibold text-ink">{result.targetProteinG}g</p>
              <p className="text-xs text-ink-muted">Protein</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3 text-center">
              <p className="text-lg font-semibold text-ink">{result.targetCarbsG}g</p>
              <p className="text-xs text-ink-muted">Carbs</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3 text-center">
              <p className="text-lg font-semibold text-ink">{result.targetFatG}g</p>
              <p className="text-xs text-ink-muted">Fat</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-8 rounded-xl bg-accent px-4 py-3 font-semibold text-white"
          >
            Looks good
          </button>
        </div>
      )}
    </div>
  );
}
