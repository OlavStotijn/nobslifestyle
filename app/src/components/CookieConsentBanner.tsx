import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/I18nContext";

const STORAGE_KEY = "nobs-cookie-ack";

export function CookieConsentBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface px-4 py-4 shadow-lg sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-ink-muted">
          {t("legal.cookieNotice")}{" "}
          <Link to="/privacy" className="font-medium text-accent">
            {t("legal.privacyPolicy")}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="w-full shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
        >
          {t("legal.cookieAccept")}
        </button>
      </div>
    </div>
  );
}
