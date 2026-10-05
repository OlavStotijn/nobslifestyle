import Capacitor
import WidgetKit

// A "local" Capacitor plugin — no npm package, just a Swift file registered
// directly in this target. Lets the web app push today's stats into the
// App Group UserDefaults the widget extension reads from.
//
// Uses the SAME TodayStats/SharedStatsStore type as the widget (see
// ../../NobsWidget/SharedStats.swift) rather than hand-rolling JSON here —
// two independent encodings of "the same data" is exactly how this kind of
// bridge quietly breaks (e.g. Date encoding strategy mismatches between a
// manual dictionary and Codable's default). Add SharedStats.swift to THIS
// target's membership too (select it in Xcode's file inspector, check the
// "App" target box) so both sides compile against one definition.
//
// SETUP STILL NEEDED IN XCODE:
// 1. Add this file (and SharedStats.swift) to the App target.
// 2. Enable the "App Groups" capability on the App target, create/select
//    group "group.com.nobslifestyle.app" (must match SharedStats.swift).
// 3. Do the same App Groups step on the NobsWidget extension target once
//    you've created it, selecting the SAME group.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateTodayStats", returnType: CAPPluginReturnPromise)
    ]

    @objc func updateTodayStats(_ call: CAPPluginCall) {
        let stats = TodayStats(
            caloriesRemaining: call.getInt("caloriesRemaining") ?? 0,
            caloriesConsumed: call.getInt("caloriesConsumed") ?? 0,
            caloriesTarget: call.getInt("caloriesTarget") ?? 0,
            updatedAt: Date()
        )
        SharedStatsStore.write(stats)

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
