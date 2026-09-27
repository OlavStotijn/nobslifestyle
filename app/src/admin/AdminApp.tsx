import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoginPage } from "../routes/LoginPage";
import { AdminLayout } from "./AdminLayout";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminUserDetailPage } from "./AdminUserDetailPage";
import { AdminModerationPage } from "./AdminModerationPage";

function AdminProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-ink-muted">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-bg text-center">
        <p className="text-lg font-semibold text-ink">Not authorized</p>
        <p className="text-sm text-ink-muted">This account doesn't have access to the admin panel.</p>
      </div>
    );
  }
  return <AdminLayout />;
}

export function AdminApp() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AdminProtectedRoute />}>
        <Route path="/dashboard" element={<AdminDashboardPage />} />
        <Route path="/users" element={<AdminUsersPage />} />
        <Route path="/users/:id" element={<AdminUserDetailPage />} />
        <Route path="/moderation" element={<AdminModerationPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
