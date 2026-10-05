import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client";

export type LandingPage = "checklist" | "food" | "workouts" | "reports" | "feed" | "profile";

export interface User {
  id: number;
  email: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  weightUnit: "kg" | "lb";
  distanceUnit: "km" | "mi";
  defaultLandingPage: LandingPage;
  restTimerSeconds: number;
  activeProgramId: number | null;
  emailVerified: boolean;
  // Only ever present (and only ever accurate) on the /auth/me response —
  // login/signup/profile-update responses don't resolve it, which is why
  // those flows call refresh() rather than trusting their own payload.
  isAdmin?: boolean;
  // false for Google/Apple sign-in accounts, which have no password the
  // owner could ever type — see completeOAuthSignIn on the worker.
  hasPassword?: boolean;
}

export interface Impersonating {
  adminUserId: number;
  adminDisplayName: string;
}

interface AuthContextValue {
  user: User | null;
  impersonating: Impersonating | null;
  loading: boolean;
  // Returns the resolved user (or null on failure) so callers — e.g. a
  // login form — can tell "the session didn't stick" apart from "you're
  // logged out" and show an actual error, instead of silently bouncing
  // back to the login screen with no explanation.
  refresh: () => Promise<User | null>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [impersonating, setImpersonating] = useState<Impersonating | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<User | null> {
    try {
      const { user, impersonating } = await api.get<{ user: User; impersonating: Impersonating | null }>("/auth/me");
      setUser(user);
      setImpersonating(impersonating);
      return user;
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) console.error(err);
      setUser(null);
      setImpersonating(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return <AuthContext.Provider value={{ user, impersonating, loading, refresh, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider.");
  return ctx;
}
