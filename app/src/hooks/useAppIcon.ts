import { Capacitor } from "@capacitor/core";
import { AppIcon } from "@capawesome/capacitor-app-icon";

// Pro feature, iOS only for now.
//
// SETUP STILL NEEDED before this does anything — I can't generate real icon
// artwork, so this is wired up but inert until you provide it:
// 1. In Xcode, duplicate ios/App/App/Assets.xcassets/AppIcon.appiconset for
//    each alternate (e.g. "Classic", "Minimal"), with real alternate
//    designs — name the new image sets exactly "Classic" / "Minimal" to
//    match ICON_OPTIONS below (or edit ICON_OPTIONS to match whatever you
//    name them — don't use an "AppIcon..." prefix, iOS silently fails to
//    render alternate icons whose name shares that prefix).
// 2. In the App target's Build Settings, search "Alternate App Icon Sets"
//    and set it to the space-separated list of names (e.g. "Classic Minimal"),
//    and set "Include All App Icon Assets" to Yes.
// Until both are done, setIcon() below will just fail with a native error —
// the UI in SettingsPage.tsx catches that and shows a message rather than
// crashing, but there's genuinely nothing to select until the art exists.
export const ICON_OPTIONS = ["Classic", "Minimal"];

export function isAppIconSwitchingAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function setAppIcon(name: string | null): Promise<void> {
  if (name === null) {
    await AppIcon.resetIcon();
  } else {
    await AppIcon.setIcon({ icon: name });
  }
}

export async function getCurrentAppIcon(): Promise<string | null> {
  const result = await AppIcon.getCurrentIcon();
  return result.icon;
}
