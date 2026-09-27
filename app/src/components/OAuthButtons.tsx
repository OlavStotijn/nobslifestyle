import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/I18nContext";
import { signInWithApple, signInWithGoogle } from "../lib/socialLogin";

interface OAuthButtonsProps {
  onError: (message: string) => void;
}

export function OAuthButtons({ onError }: OAuthButtonsProps) {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { t } = useTranslation();
  const [pending, setPending] = useState<"google" | "apple" | null>(null);

  async function handleGoogle() {
    onError("");
    setPending("google");
    try {
      const { idToken } = await signInWithGoogle();
      await api.post("/auth/oauth/google", { idToken });
      const user = await refresh();
      if (!user) {
        onError("Signed in, but couldn't load your session. Please try again.");
        return;
      }
      navigate("/");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Google sign-in failed.");
    } finally {
      setPending(null);
    }
  }

  async function handleApple() {
    onError("");
    setPending("apple");
    try {
      const { idToken, fullName } = await signInWithApple();
      await api.post("/auth/oauth/apple", { idToken, fullName });
      const user = await refresh();
      if (!user) {
        onError("Signed in, but couldn't load your session. Please try again.");
        return;
      }
      navigate("/");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Apple sign-in failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-muted">{t("auth.orContinueWith")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={pending !== null}
        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 font-medium text-ink transition-opacity disabled:opacity-50"
      >
        <GoogleIcon />
        {pending === "google" ? t("auth.signingIn") : t("auth.continueWithGoogle")}
      </button>

      <button
        type="button"
        onClick={handleApple}
        disabled={pending !== null}
        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 font-medium text-ink transition-opacity disabled:opacity-50"
      >
        <AppleIcon />
        {pending === "apple" ? t("auth.signingIn") : t("auth.continueWithApple")}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 384 512" aria-hidden="true" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
