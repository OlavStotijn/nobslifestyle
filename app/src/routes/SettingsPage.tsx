import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUpdateProfile } from "../api/hooks/useProfile";
import type { LandingPage } from "../context/AuthContext";

const LANDING_OPTIONS: { value: LandingPage; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "food", label: "Food" },
  { value: "workouts", label: "Workout" },
  { value: "feed", label: "Feed" },
  { value: "profile", label: "Profile" },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const updateProfile = useUpdateProfile();

  async function selectLandingPage(value: LandingPage) {
    const updated = await updateProfile.mutateAsync({ defaultLandingPage: value });
    setUser(updated);
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/profile")} className="self-start text-sm text-ink-muted">
        ← Profile
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">Settings</h1>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Opens on app load</h2>
        <div className="mt-2 flex flex-col gap-2">
          {LANDING_OPTIONS.map((opt) => {
            const selected = user?.defaultLandingPage === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectLandingPage(opt.value)}
                disabled={updateProfile.isPending}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                  selected ? "border-accent bg-accent-soft" : "border-border bg-surface"
                }`}
              >
                <span className="font-medium text-ink">{opt.label}</span>
                {selected && <span className="text-accent">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
