import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  useCreateWaterLog,
  useDeleteWaterLog,
  useUpdateWaterSettings,
  useWaterLogs,
  useWaterSettings,
} from "../api/hooks/useWater";
import { todayLocalDate } from "../api/hooks/useFoodLogs";
import { useWaterReminders } from "../hooks/useWaterReminders";
import { BottomSheet } from "./BottomSheet";

const QUICK_AMOUNTS = [
  { label: "Glass", ml: 200 },
  { label: "Cup", ml: 250 },
  { label: "Bottle", ml: 500 },
];

const GOAL_PRESETS_ML = [1500, 2000, 2500, 3000];
const INTERVAL_PRESETS_MIN = [30, 60, 90, 120];

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WaterSettingsSheet({ onClose }: { onClose: () => void }) {
  const { data: settings } = useWaterSettings();
  const update = useUpdateWaterSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!settings) return null;

  function selectInterval(min: number) {
    if (min < 60 && !user?.isPro) {
      onClose();
      navigate("/profile/plan");
      return;
    }
    update.mutate({ reminderIntervalMinutes: min });
  }

  return (
    <BottomSheet open onClose={onClose}>
      <h2 className="text-lg font-bold text-ink">Water settings</h2>

      <div className="mt-4">
        <p className="text-sm font-medium text-ink-muted">Daily goal</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {GOAL_PRESETS_ML.map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => update.mutate({ goalMl: ml })}
              className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                settings.goalMl === ml ? "border-accent bg-accent-soft text-accent" : "border-border bg-bg text-ink"
              }`}
            >
              {ml / 1000}L
            </button>
          ))}
        </div>
        <input
          type="number"
          inputMode="numeric"
          defaultValue={settings.goalMl}
          onBlur={(e) => {
            const ml = Number(e.target.value);
            if (ml > 0) update.mutate({ goalMl: ml });
          }}
          className="mt-2 w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-accent"
        />
      </div>

      <button
        type="button"
        onClick={() => update.mutate({ remindersEnabled: !settings.remindersEnabled })}
        className={`mt-5 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
          settings.remindersEnabled ? "border-accent bg-accent-soft" : "border-border bg-bg"
        }`}
      >
        <span className="font-medium text-ink">Reminders</span>
        <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${settings.remindersEnabled ? "bg-accent" : "bg-surface-2"}`}>
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: settings.remindersEnabled ? "translateX(1.125rem)" : "translateX(0.125rem)" }}
          />
        </span>
      </button>

      {settings.remindersEnabled && (
        <div className="mt-3 flex flex-col gap-3">
          {typeof Notification !== "undefined" && Notification.permission === "denied" && (
            <p className="text-sm text-red-500">
              Notifications are blocked for this site in your browser — enable them in your browser settings to get reminders.
            </p>
          )}
          <div>
            <p className="text-sm font-medium text-ink-muted">Remind me every</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {INTERVAL_PRESETS_MIN.map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => selectInterval(min)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                    settings.reminderIntervalMinutes === min ? "border-accent bg-accent-soft text-accent" : "border-border bg-bg text-ink"
                  }`}
                >
                  {min < 60 && !user?.isPro ? "✨" : `${min}m`}
                </button>
              ))}
            </div>
            {!user?.isPro && <p className="mt-1 text-xs text-ink-muted">✨ Pro unlocks more frequent reminders</p>}
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-muted">From</span>
              <input
                type="time"
                defaultValue={settings.reminderStartTime}
                onBlur={(e) => e.target.value && update.mutate({ reminderStartTime: e.target.value })}
                className="rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-muted">Until</span>
              <input
                type="time"
                defaultValue={settings.reminderEndTime}
                onBlur={(e) => e.target.value && update.mutate({ reminderEndTime: e.target.value })}
                className="rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-accent"
              />
            </label>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-muted">Reminders only fire while the app is open in a browser tab.</p>

      <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-accent px-4 py-3 text-center font-semibold text-white">
        Done
      </button>
    </BottomSheet>
  );
}

export function WaterTracker() {
  const date = todayLocalDate();
  const { data: logs } = useWaterLogs(date);
  const { data: settings } = useWaterSettings();
  const createLog = useCreateWaterLog(date);
  const deleteLog = useDeleteWaterLog(date);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMl, setCustomMl] = useState("250");

  const totalMl = (logs ?? []).reduce((sum, l) => sum + l.amountMl, 0);
  const goalMl = settings?.goalMl ?? 2000;
  const pct = Math.min(100, Math.round((totalMl / goalMl) * 100));

  useWaterReminders(settings, logs, totalMl);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Water</h2>
        <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Water settings" className="text-ink-muted">
          <GearIcon />
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <p className="text-2xl font-bold text-ink">
          {(totalMl / 1000).toFixed(2).replace(/\.?0+$/, "") || "0"}L
          <span className="ml-1 text-base font-normal text-ink-muted">/ {(goalMl / 1000).toFixed(1)}L</span>
        </p>
        {logs && logs.length > 0 && (
          <button type="button" onClick={() => deleteLog.mutate(logs[logs.length - 1].id)} className="text-xs text-ink-muted hover:text-red-500">
            Undo last
          </button>
        )}
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className="h-full rounded-full bg-blue-500"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      <div className="mt-4 flex gap-2">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q.ml}
            type="button"
            disabled={createLog.isPending}
            onClick={() => createLog.mutate(q.ml)}
            className="flex-1 rounded-xl border border-border bg-bg px-2 py-2.5 text-center text-sm font-semibold text-ink disabled:opacity-50"
          >
            +{q.ml}ml
            <span className="block text-xs font-normal text-ink-muted">{q.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className="flex-1 rounded-xl border border-dashed border-border bg-bg px-2 py-2.5 text-center text-sm font-semibold text-ink-muted"
        >
          Custom
        </button>
      </div>

      {customOpen && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const ml = Number(customMl);
            if (ml > 0) {
              createLog.mutate(ml);
              setCustomOpen(false);
            }
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-bg px-4 py-2.5 text-ink outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-white">
            Add
          </button>
        </form>
      )}

      {settingsOpen && <WaterSettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
