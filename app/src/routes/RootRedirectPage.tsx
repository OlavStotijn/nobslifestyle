import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNutritionProfile } from "../api/hooks/useNutritionProfile";

// "/" itself renders nothing — it just resolves to the user's chosen landing
// tab (Settings → "Opens on app load"), defaulting to Summary, after making
// sure onboarding is actually done first.
export function RootRedirectPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useNutritionProfile();

  if (isLoading) {
    return <div className="flex min-h-full items-center justify-center bg-bg text-ink-muted">Loading…</div>;
  }

  if (!profile?.onboardingCompletedAt) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to={`/${user?.defaultLandingPage ?? "summary"}`} replace />;
}
