import { registerPlugin } from "@capacitor/core";

// Matches the local (no npm package) native plugin at
// ios/App/App/WidgetBridgePlugin.swift — only does anything once the
// NobsWidget extension target exists and both targets share the
// "group.com.nobslifestyle.app" App Group (see ios/NobsWidget/ setup notes).
// Calling it before that setup is harmless — the native side just isn't
// compiled in yet, so this plugin object won't exist and calls resolve to
// nothing via Capacitor's usual "plugin not implemented" handling.
interface WidgetBridgePlugin {
  updateTodayStats(stats: { caloriesRemaining: number; caloriesConsumed: number; caloriesTarget: number }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

export function updateWidgetStats(stats: { caloriesRemaining: number; caloriesConsumed: number; caloriesTarget: number }): void {
  WidgetBridge.updateTodayStats(stats).catch(() => {
    // Widget extension/App Group not set up yet — nothing to do.
  });
}
