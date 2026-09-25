import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUpdateProfile } from "../api/hooks/useProfile";
import { useTranslation } from "../i18n/I18nContext";
import { LANGUAGE_LABELS, type LanguageCode } from "../i18n/translations";
import type { LandingPage } from "../context/AuthContext";

const LANDING_OPTIONS: { value: LandingPage; labelKey: "nav.summary" | "nav.food" | "nav.workout" | "nav.feed" | "nav.profile" }[] = [
  { value: "summary", labelKey: "nav.summary" },
  { value: "food", labelKey: "nav.food" },
  { value: "workouts", labelKey: "nav.workout" },
  { value: "feed", labelKey: "nav.feed" },
  { value: "profile", labelKey: "nav.profile" },
];

const LANGUAGES: LanguageCode[] = ["en", "nl"];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{title}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function OptionButton({ selected, label, onClick, disabled }: { selected: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
        selected ? "border-accent bg-accent-soft" : "border-border bg-surface"
      }`}
    >
      <span className="font-medium text-ink">{label}</span>
      {selected && <span className="text-accent">✓</span>}
    </button>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const { t, language, setLanguage } = useTranslation();

  async function selectLandingPage(value: LandingPage) {
    const updated = await updateProfile.mutateAsync({ defaultLandingPage: value });
    setUser(updated);
  }

  async function selectWeightUnit(value: "kg" | "lb") {
    const updated = await updateProfile.mutateAsync({ weightUnit: value });
    setUser(updated);
  }

  async function selectDistanceUnit(value: "km" | "mi") {
    const updated = await updateProfile.mutateAsync({ distanceUnit: value });
    setUser(updated);
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/profile")} className="self-start text-sm text-ink-muted">
        ← {t("common.back")}
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">{t("settings.title")}</h1>

      <SectionCard title={t("settings.opensOnLoad")}>
        {LANDING_OPTIONS.map((opt) => (
          <OptionButton
            key={opt.value}
            selected={user?.defaultLandingPage === opt.value}
            label={t(opt.labelKey)}
            onClick={() => selectLandingPage(opt.value)}
            disabled={updateProfile.isPending}
          />
        ))}
      </SectionCard>

      <SectionCard title={t("settings.language")}>
        {LANGUAGES.map((code) => (
          <OptionButton
            key={code}
            selected={language === code}
            label={LANGUAGE_LABELS[code]}
            onClick={() => setLanguage(code)}
          />
        ))}
      </SectionCard>

      <SectionCard title={`${t("settings.units")} — ${t("settings.weightUnit")}`}>
        <div className="flex gap-2">
          <div className="flex-1">
            <OptionButton selected={user?.weightUnit === "kg"} label="kg" onClick={() => selectWeightUnit("kg")} disabled={updateProfile.isPending} />
          </div>
          <div className="flex-1">
            <OptionButton selected={user?.weightUnit === "lb"} label="lbs" onClick={() => selectWeightUnit("lb")} disabled={updateProfile.isPending} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("settings.distanceUnit")}>
        <div className="flex gap-2">
          <div className="flex-1">
            <OptionButton selected={user?.distanceUnit === "km"} label="km" onClick={() => selectDistanceUnit("km")} disabled={updateProfile.isPending} />
          </div>
          <div className="flex-1">
            <OptionButton selected={user?.distanceUnit === "mi"} label="mi" onClick={() => selectDistanceUnit("mi")} disabled={updateProfile.isPending} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
