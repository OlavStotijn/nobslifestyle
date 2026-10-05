import { Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import { SplashScreen } from "../components/SplashScreen";
import { LandingPage } from "./LandingPage";
import { RootRedirectPage } from "./RootRedirectPage";

// "/" is the one route that's meaningfully different for logged-out vs.
// logged-in visitors on the web: a marketing page that sells the app, or an
// instant redirect into it. Kept outside ProtectedRoute so logged-out web
// visitors see the pitch instead of being bounced straight to /login.
//
// Inside the native app there's no one to pitch — you already installed it —
// so logged-out users go straight to /login instead of seeing the website's
// marketing page.
export function RootPage() {
  const { user, loading } = useAuth();

  return (
    <SplashScreen ready={!loading}>
      {!user ? (
        Capacitor.isNativePlatform() ? (
          <Navigate to="/login" replace />
        ) : (
          <LandingPage />
        )
      ) : (
        <RootRedirectPage />
      )}
    </SplashScreen>
  );
}
