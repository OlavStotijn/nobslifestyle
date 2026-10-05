import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SplashScreen } from "../components/SplashScreen";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  return <SplashScreen ready={!loading}>{!user ? <Navigate to="/login" replace /> : <Outlet />}</SplashScreen>;
}
