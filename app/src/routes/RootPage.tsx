import { useAuth } from "../context/AuthContext";
import { LandingPage } from "./LandingPage";
import { RootRedirectPage } from "./RootRedirectPage";

// "/" is the one route that's meaningfully different for logged-out vs.
// logged-in visitors: a marketing page that sells the app, or an instant
// redirect into it. Kept outside ProtectedRoute so logged-out visitors see
// the pitch instead of being bounced straight to /login.
export function RootPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-full items-center justify-center bg-bg text-ink-muted">Loading…</div>;
  }

  if (!user) return <LandingPage />;

  return <RootRedirectPage />;
}
