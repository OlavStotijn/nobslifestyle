import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

interface UpdateManifest {
  version: string;
  url: string;
}

// Self-hosted live updates for the native app (see
// scripts/build-update-bundle.mjs) — deliberately not using the plugin's
// built-in autoUpdate/getLatest() flow, since that speaks Capgo's own cloud
// API protocol, which this app doesn't use. A plain manifest fetch plus
// download()/next() is simpler and fully within our control for a single
// self-hosted app.
//
// next() (not set()) queues the update for the next time the app
// backgrounds or relaunches, rather than destroying the current JS context
// mid-session — matches "reopen the app to get the latest version."
export async function checkForLiveUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Must be called on every native launch, before any network request —
  // the plugin assumes the bundle failed to load (and rolls back to the
  // previous one) if this doesn't happen within its timeout.
  await CapacitorUpdater.notifyAppReady();

  try {
    const res = await fetch("https://nobslifestyle.com/updates/manifest.json");
    if (!res.ok) return;
    const manifest: UpdateManifest = await res.json();

    const { bundle } = await CapacitorUpdater.current();
    if (bundle.version === manifest.version) return;

    const next = await CapacitorUpdater.download({ url: manifest.url, version: manifest.version });
    await CapacitorUpdater.next({ id: next.id });
  } catch {
    // Best-effort — a failed check just leaves the app on its current
    // bundle until the next successful one.
  }
}
