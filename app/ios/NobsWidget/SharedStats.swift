import Foundation

// Shared between the main App target and the NobsWidget extension via an
// App Group container — WidgetKit extensions run in a separate process and
// can't call into the main app's JS/WKWebView directly, so this is the
// hand-off point. Add this same file to BOTH targets in Xcode (select it in
// the file inspector, check both target membership boxes).
struct TodayStats: Codable {
    let caloriesRemaining: Int
    let caloriesConsumed: Int
    let caloriesTarget: Int
    let updatedAt: Date
}

enum SharedStatsStore {
    // Must match the App Group identifier you create in Xcode (Signing &
    // Capabilities → + Capability → App Groups, on both targets) — e.g.
    // "group.com.nobslifestyle.app".
    static let appGroupId = "group.com.nobslifestyle.app"
    private static let key = "todayStats"

    static func write(_ stats: TodayStats) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        guard let data = try? JSONEncoder().encode(stats) else { return }
        defaults.set(data, forKey: key)
    }

    static func read() -> TodayStats? {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return nil }
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(TodayStats.self, from: data)
    }
}
