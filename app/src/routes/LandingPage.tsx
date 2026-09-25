import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTranslation } from "../i18n/I18nContext";
import type { TranslationKey } from "../i18n/translations";

const FEATURES: { icon: string; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { icon: "🏋️", titleKey: "landing.feature.schemasTitle", bodyKey: "landing.feature.schemasBody" },
  { icon: "📈", titleKey: "landing.feature.progressTitle", bodyKey: "landing.feature.progressBody" },
  { icon: "🏃", titleKey: "landing.feature.gpsTitle", bodyKey: "landing.feature.gpsBody" },
  { icon: "🍽️", titleKey: "landing.feature.foodTitle", bodyKey: "landing.feature.foodBody" },
  { icon: "👥", titleKey: "landing.feature.friendsTitle", bodyKey: "landing.feature.friendsBody" },
  { icon: "📱", titleKey: "landing.feature.pwaTitle", bodyKey: "landing.feature.pwaBody" },
];

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-ink">NoBSLifestyle</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-semibold text-ink-muted">
              {t("auth.login")}
            </Link>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center text-center sm:mt-24">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-ink sm:text-6xl">
            {t("landing.headline1")} <span className="text-accent">{t("landing.headline2")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted">{t("landing.subheadline")}</p>

          <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/signup"
              className="rounded-xl bg-accent px-8 py-3.5 text-center font-semibold text-white shadow-lg shadow-accent/20"
            >
              {t("landing.getStartedFree")}
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-border px-8 py-3.5 text-center font-semibold text-ink"
            >
              {t("auth.login")}
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-4 sm:mt-28 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.titleKey} className="rounded-2xl border border-border bg-surface p-6">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-4 font-semibold text-ink">{t(f.titleKey)}</h3>
              <p className="mt-1.5 text-sm text-ink-muted">{t(f.bodyKey)}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col items-center rounded-3xl border border-border bg-surface px-8 py-14 text-center sm:mt-28">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">{t("landing.readyHeadline")}</h2>
          <p className="mt-2 max-w-md text-ink-muted">{t("landing.readySubtitle")}</p>
          <Link
            to="/signup"
            className="mt-6 rounded-xl bg-accent px-8 py-3.5 text-center font-semibold text-white shadow-lg shadow-accent/20"
          >
            {t("landing.createAccount")}
          </Link>
        </div>

        <footer className="mt-16 flex flex-col items-center gap-1 pb-8 text-center text-xs text-ink-muted">
          <p>NoBSLifestyle.com</p>
          <p>{t("landing.footerTagline")}</p>
        </footer>
      </div>
    </div>
  );
}
