import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUpdateProfile } from "../api/hooks/useProfile";
import { useBlockedUsers, useDeleteAccount, useUnblockUser } from "../api/hooks/useSafety";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "../i18n/I18nContext";
import { LANGUAGE_LABELS, type LanguageCode } from "../i18n/translations";
import type { LandingPage } from "../context/AuthContext";
import { isPushSubscribed, subscribeToPush, unsubscribeFromPush } from "../api/hooks/useNotifications";
import { ApiError } from "../api/client";
import { exportWeightToHealth, importWeightFromHealth, isHealthSyncAvailable } from "../hooks/useHealthSync";
import { ICON_OPTIONS, isAppIconSwitchingAvailable, setAppIcon } from "../hooks/useAppIcon";
import { useWeightLogs } from "../api/hooks/useProgress";
import { useQueryClient } from "@tanstack/react-query";

const REST_TIMER_OPTIONS = [60, 90, 120, 180];

const LANDING_OPTIONS: {
  value: LandingPage;
  labelKey: "nav.checklist" | "nav.food" | "nav.workout" | "nav.reports" | "nav.feed" | "nav.profile";
}[] = [
  { value: "checklist", labelKey: "nav.checklist" },
  { value: "food", labelKey: "nav.food" },
  { value: "workouts", labelKey: "nav.workout" },
  { value: "reports", labelKey: "nav.reports" },
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

function AppIconButtons() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(name: string | null) {
    setError(null);
    setBusy(true);
    try {
      await setAppIcon(name);
    } catch {
      setError("Not set up yet — this needs real alternate icon artwork added in Xcode first.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => pick(null)}
          disabled={busy}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink disabled:opacity-50"
        >
          Default
        </button>
        {ICON_OPTIONS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => pick(name)}
            disabled={busy}
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink disabled:opacity-50"
          >
            {name}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </>
  );
}

function HealthSyncButtons() {
  const { data: logs } = useWeightLogs();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"import" | "export" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function doImport() {
    setBusy("import");
    setMessage(null);
    try {
      const existingDates = new Set((logs ?? []).map((l) => l.loggedDate));
      const count = await importWeightFromHealth(existingDates);
      queryClient.invalidateQueries({ queryKey: ["weight-logs"] });
      setMessage(count > 0 ? `Imported ${count} weight entr${count === 1 ? "y" : "ies"} from Health.` : "Nothing new to import.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't sync with Apple Health.");
    } finally {
      setBusy(null);
    }
  }

  async function doExport() {
    setBusy("export");
    setMessage(null);
    try {
      const count = await exportWeightToHealth(logs ?? []);
      setMessage(count > 0 ? `Sent ${count} weight entr${count === 1 ? "y" : "ies"} to Health.` : "Nothing new to send.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't sync with Apple Health.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={doImport}
        disabled={busy !== null}
        className="rounded-xl border border-border bg-surface px-4 py-3 text-left font-medium text-ink disabled:opacity-50"
      >
        {busy === "import" ? "Importing…" : "Import weight from Health"}
      </button>
      <button
        type="button"
        onClick={doExport}
        disabled={busy !== null}
        className="rounded-xl border border-border bg-surface px-4 py-3 text-left font-medium text-ink disabled:opacity-50"
      >
        {busy === "export" ? "Sending…" : "Send my weight log to Health"}
      </button>
      {message && <p className="text-sm text-ink-muted">{message}</p>}
    </>
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
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const { data: blockedUsers } = useBlockedUsers();
  const unblock = useUnblockUser();
  const deleteAccount = useDeleteAccount();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

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

  async function selectRestTimer(seconds: number) {
    const updated = await updateProfile.mutateAsync({ restTimerSeconds: seconds });
    setUser(updated);
  }

  async function togglePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const result = await subscribeToPush();
        if (result === "subscribed") setPushEnabled(true);
        else if (result === "denied") setPushError("Notifications permission was denied.");
        else setPushError("Push notifications aren't supported on this browser.");
      }
    } finally {
      setPushBusy(false);
    }
  }

  async function confirmDeleteAccount() {
    setDeleteError(null);
    try {
      await deleteAccount.mutateAsync(user?.hasPassword === false ? { confirm: "DELETE" } : { password: deletePassword });
      setUser(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete your account. Please try again.");
    }
  }

  function exportCsv(kind: "sessions" | "food-logs") {
    window.location.href = `/api/export/${kind}.csv`;
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/profile")} className="self-start text-sm text-ink-muted">
        ← {t("common.back")}
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">{t("settings.title")}</h1>

      <SectionCard title={t("settings.appearance")}>
        <OptionButton selected={theme === "light"} label={t("settings.themeLight")} onClick={() => setTheme("light")} />
        <OptionButton selected={theme === "dark"} label={t("settings.themeDark")} onClick={() => setTheme("dark")} />
      </SectionCard>

      <SectionCard title="Accent color">
        <OptionButton selected={accentColor === "green"} label="Green (default)" onClick={() => setAccentColor("green")} />
        {user?.isPro ? (
          <>
            <OptionButton selected={accentColor === "blue"} label="Blue" onClick={() => setAccentColor("blue")} />
            <OptionButton selected={accentColor === "purple"} label="Purple" onClick={() => setAccentColor("purple")} />
          </>
        ) : (
          <Link to="/profile/plan" className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-ink-muted">
            ✨ Blue &amp; Purple — Pro feature
          </Link>
        )}
      </SectionCard>

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

      <SectionCard title="Rest timer">
        <div className="grid grid-cols-4 gap-2">
          {REST_TIMER_OPTIONS.map((s) => (
            <OptionButton
              key={s}
              selected={user?.restTimerSeconds === s}
              label={`${s}s`}
              onClick={() => selectRestTimer(s)}
              disabled={updateProfile.isPending}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Notifications">
        <button
          type="button"
          onClick={togglePush}
          disabled={pushBusy}
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
            pushEnabled ? "border-accent bg-accent-soft" : "border-border bg-surface"
          }`}
        >
          <span className="font-medium text-ink">Push notifications</span>
          <span
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${pushEnabled ? "bg-accent" : "bg-surface-2"}`}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: pushEnabled ? "translateX(1.125rem)" : "translateX(0.125rem)" }}
            />
          </span>
        </button>
        {pushError && <p className="text-sm text-red-500">{pushError}</p>}
      </SectionCard>

      {isHealthSyncAvailable() && (
        <SectionCard title="Apple Health">
          {user?.isPro ? (
            <HealthSyncButtons />
          ) : (
            <Link to="/profile/plan" className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-ink-muted">
              ✨ Sync weight with Apple Health — Pro feature
            </Link>
          )}
        </SectionCard>
      )}

      {isAppIconSwitchingAvailable() && (
        <SectionCard title="App icon">
          {user?.isPro ? (
            <AppIconButtons />
          ) : (
            <Link to="/profile/plan" className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-ink-muted">
              ✨ Alternate app icons — Pro feature
            </Link>
          )}
        </SectionCard>
      )}

      <SectionCard title="Export your data">
        <button type="button" onClick={() => exportCsv("sessions")} className="rounded-xl border border-border bg-surface px-4 py-3 text-left font-medium text-ink">
          Download workout history (CSV)
        </button>
        <button type="button" onClick={() => exportCsv("food-logs")} className="rounded-xl border border-border bg-surface px-4 py-3 text-left font-medium text-ink">
          Download food log (CSV)
        </button>
        {user?.isPro ? (
          <button
            type="button"
            onClick={() => (window.location.href = "/api/export/report.pdf")}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-left font-medium text-ink"
          >
            Download progress report (PDF)
          </button>
        ) : (
          <Link to="/profile/plan" className="rounded-xl border border-border bg-surface px-4 py-3 text-left font-medium text-ink-muted">
            ✨ Progress report (PDF) — Pro feature
          </Link>
        )}
      </SectionCard>

      <SectionCard title="Blocked users">
        {blockedUsers?.length === 0 && <p className="text-sm text-ink-muted">You haven't blocked anyone.</p>}
        {blockedUsers?.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <div>
              <p className="font-medium text-ink">{u.displayName}</p>
              {u.username && <p className="text-sm text-ink-muted">@{u.username}</p>}
            </div>
            <button
              type="button"
              onClick={() => unblock.mutate(u.id)}
              disabled={unblock.isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-50"
            >
              Unblock
            </button>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Delete account">
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-xl border border-red-500 px-4 py-3 text-left font-medium text-red-500"
          >
            Delete my account
          </button>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-red-500 p-4">
            <p className="text-sm text-ink">
              This permanently deletes your account and all your data — workouts, food logs, photos, posts and friends. It
              can't be undone.
            </p>
            {user?.hasPassword === false ? (
              <>
                <label className="text-sm text-ink-muted" htmlFor="delete-confirm">
                  Type DELETE to confirm
                </label>
                <input
                  id="delete-confirm"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-ink outline-none focus:border-red-500"
                />
              </>
            ) : (
              <>
                <label className="text-sm text-ink-muted" htmlFor="delete-password">
                  Enter your password to confirm
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-ink outline-none focus:border-red-500"
                />
              </>
            )}
            {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
            <button
              type="button"
              onClick={confirmDeleteAccount}
              disabled={(user?.hasPassword === false ? deleteText !== "DELETE" : deletePassword === "") || deleteAccount.isPending}
              className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {deleteAccount.isPending ? "Deleting…" : "Permanently delete account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(false);
                setDeleteText("");
                setDeletePassword("");
                setDeleteError(null);
              }}
              className="px-4 py-2 text-sm text-ink-muted"
            >
              Cancel
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
