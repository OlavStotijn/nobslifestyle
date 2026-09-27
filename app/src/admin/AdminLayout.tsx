import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { ThemeToggle } from "../components/ThemeToggle";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/users", label: "Users" },
  { to: "/moderation", label: "Moderation" },
];

export function AdminLayout() {
  const { user, setUser } = useAuth();

  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-bold text-ink">NoBSLifestyle Admin</span>
          <nav className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `text-sm font-medium ${isActive ? "text-accent" : "text-ink-muted"}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink-muted">{user?.displayName}</span>
          <ThemeToggle />
          <button type="button" onClick={logout} className="text-sm font-medium text-ink-muted">
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
