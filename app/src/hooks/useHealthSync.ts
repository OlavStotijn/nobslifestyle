import { Capacitor } from "@capacitor/core";
import { Health } from "@capgo/capacitor-health";
import { api } from "../api/client";

// Pro feature, iOS only for now. Manual, user-triggered sync — no
// background task is configured (that needs its own native entitlement +
// BGTaskScheduler setup, out of scope here).
//
// SETUP STILL NEEDED IN XCODE before this compiles/runs on a real device:
// enable the "HealthKit" capability under Signing & Capabilities for the
// App target. The entitlement key and Info.plist usage strings are already
// in place (App.entitlements, Info.plist) — Xcode's capability toggle is
// what actually registers HealthKit on the App ID via your Apple Developer
// account; editing the entitlements file by hand doesn't do that part.

export function isHealthSyncAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

async function ensureAuthorized(): Promise<void> {
  const availability = await Health.isAvailable();
  if (!availability.available) throw new Error("Apple Health isn't available on this device.");
  await Health.requestAuthorization({ read: ["weight"], write: ["weight"] });
}

// Reads weight entries Apple Health knows about (from the Health app, a
// smart scale, etc.) and logs any that aren't already in the app, matched
// by date — a user logging in both places on the same day just keeps the
// app's own entry, not a duplicate.
export async function importWeightFromHealth(existingLoggedDates: Set<string>): Promise<number> {
  await ensureAuthorized();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  const { samples } = await Health.readSamples({
    dataType: "weight",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: 200,
    ascending: true,
  });

  let imported = 0;
  for (const sample of samples) {
    if (sample.unit !== "kilogram") continue;
    const date = sample.startDate.slice(0, 10);
    if (existingLoggedDates.has(date)) continue;

    await api.post("/weight-logs", { weightKg: sample.value, note: "Imported from Apple Health" });
    existingLoggedDates.add(date);
    imported++;
  }
  return imported;
}

// Writes the app's own weight logs to Apple Health, skipping ones already
// sourced from Health (re-exporting an import would create a duplicate).
export async function exportWeightToHealth(logs: { weightKg: number; loggedDate: string; note: string | null }[]): Promise<number> {
  await ensureAuthorized();

  let exported = 0;
  for (const log of logs) {
    if (log.note === "Imported from Apple Health") continue;
    await Health.saveSample({
      dataType: "weight",
      value: log.weightKg,
      unit: "kilogram",
      startDate: `${log.loggedDate}T12:00:00.000Z`,
      endDate: `${log.loggedDate}T12:00:00.000Z`,
    });
    exported++;
  }
  return exported;
}
