import { Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import { LandingPage } from "./LandingPage";

// "/home" is the web-only marketing page, reachable even while logged in
// (unlike "/", which redirects a logged-in visitor straight into the app).
// Inside the native app this redirects away instead of ever rendering —
// there's no point marketing the app to someone who already installed it.
export function HomePage() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (Capacitor.isNativePlatform()) return <Navigate to={user ? "/" : "/login"} replace />;

  return <LandingPage />;
}
