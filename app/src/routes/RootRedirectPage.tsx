import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNutritionProfile } from "../api/hooks/useNutritionProfile";

// "/" itself renders nothing — it resolves to: verify email (hard gate) →
// onboarding → the user's chosen landing tab (Settings → "Opens on app load"),
// defaulting to Summary.
export function RootRedirectPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useNutritionProfile();

  if (isLoading) {
    return <div className="flex min-h-full items-center justify-center bg-bg text-ink-muted">Loading…</div>;
  }

  if (!user?.emailVerified) {
    return <Navigate to="/verify-email-required" replace />;
  }

  if (!profile?.onboardingCompletedAt) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to={`/${user?.defaultLandingPage ?? "summary"}`} replace />;
}
