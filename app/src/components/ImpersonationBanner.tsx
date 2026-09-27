import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

// Mounted once in AppLayout so it's visible across every consumer tab
// whenever the current session is an admin-initiated impersonation.
export function ImpersonationBanner() {
  const { impersonating, refresh } = useAuth();
  const [returning, setReturning] = useState(false);

  if (!impersonating) return null;

  async function returnToAdmin() {
    setReturning(true);
    try {
      await api.post("/admin/return");
      await refresh();
      window.location.href = "https://admin.nobslifestyle.com/users";
    } finally {
      setReturning(false);
    }
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-black">
      <span>Viewing as this user — admin: {impersonating.adminDisplayName}</span>
      <button type="button" onClick={returnToAdmin} disabled={returning} className="underline disabled:opacity-60">
        {returning ? "Returning…" : "Return to admin"}
      </button>
    </div>
  );
}
