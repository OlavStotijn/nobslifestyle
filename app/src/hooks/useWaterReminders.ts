import { useEffect, useRef } from "react";
import type { WaterLog, WaterSettings } from "../api/hooks/useWater";

// Local-only reminders: there's no server-side cron/push wired up for this
// yet, so these only fire while the app is open in a tab (checked once a
// minute against the user's reminder window and interval).
const LAST_REMINDER_KEY = "nobs-water-last-reminder-at";

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutesLocal(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

async function showReminder(remainingMl: number, goalMl: number): Promise<void> {
  const body = remainingMl > 0 ? `${remainingMl}ml left to hit your ${goalMl}ml goal today.` : "You've hit your water goal for today.";
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification("Time to drink water", { body, icon: "/icons/icon-192.png", tag: "water-reminder" });
      return;
    }
  } catch {
    // fall through to a plain Notification
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("Time to drink water", { body });
  }
}

export function useWaterReminders(settings: WaterSettings | undefined, logs: WaterLog[] | undefined, totalMl: number) {
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (!settings?.remindersEnabled) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default" && !permissionRequested.current) {
      permissionRequested.current = true;
      Notification.requestPermission();
    }
  }, [settings?.remindersEnabled]);

  useEffect(() => {
    if (!settings?.remindersEnabled) return;
    if (typeof Notification === "undefined") return;

    function check() {
      if (!settings) return;
      if (Notification.permission !== "granted") return;
      if (totalMl >= settings.goalMl) return;

      const nowMin = nowMinutesLocal();
      const startMin = parseTimeToMinutes(settings.reminderStartTime);
      const endMin = parseTimeToMinutes(settings.reminderEndTime);
      const withinWindow = startMin <= endMin ? nowMin >= startMin && nowMin <= endMin : nowMin >= startMin || nowMin <= endMin;
      if (!withinWindow) return;

      const lastLogAt = logs && logs.length > 0 ? new Date(logs[logs.length - 1].loggedAt).getTime() : 0;
      const lastReminderAt = Number(localStorage.getItem(LAST_REMINDER_KEY) ?? "0");
      const lastActionAt = Math.max(lastLogAt, lastReminderAt);

      // First time we ever see this device/window active: set a baseline
      // instead of firing immediately.
      if (lastActionAt === 0) {
        localStorage.setItem(LAST_REMINDER_KEY, String(Date.now()));
        return;
      }

      const minutesSince = (Date.now() - lastActionAt) / 60_000;
      if (minutesSince >= settings.reminderIntervalMinutes) {
        showReminder(Math.max(0, settings.goalMl - totalMl), settings.goalMl);
        localStorage.setItem(LAST_REMINDER_KEY, String(Date.now()));
      }
    }

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [settings, logs, totalMl]);
}
