import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client";

export type LandingPage = "summary" | "food" | "workouts" | "feed" | "profile";

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
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { user } = await api.get<{ user: User }>("/auth/me");
      setUser(user);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) console.error(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return <AuthContext.Provider value={{ user, loading, refresh, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider.");
  return ctx;
}
