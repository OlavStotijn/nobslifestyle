import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { refresh } = useAuth();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("This link is missing its token.");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(async () => {
        setStatus("success");
        await refresh();
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiError ? err.message : "Something went wrong.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-bg px-6 py-8 text-center">
      {status === "pending" && <p className="text-ink-muted">Verifying…</p>}
      {status === "success" && (
        <>
          <h1 className="text-2xl font-bold text-ink">Email verified</h1>
          <p className="mt-2 text-ink-muted">You're all set.</p>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-ink">Couldn't verify</h1>
          <p className="mt-2 text-red-500">{error}</p>
        </>
      )}
      <Link to="/" className="mt-6 rounded-xl bg-accent px-4 py-3 font-semibold text-white">
        Continue to the app
      </Link>
    </div>
  );
}
