import WidgetKit
import SwiftUI

// This file goes INTO the new "NobsWidget" WidgetKit extension target you
// create in Xcode (File > New > Target > Widget Extension) — it's not part
// of the main App target. See SharedStats.swift (add that one to BOTH
// targets) and the setup notes in this folder.

struct TodayStatsProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayStatsEntry {
        TodayStatsEntry(date: Date(), stats: TodayStats(caloriesRemaining: 1200, caloriesConsumed: 1000, caloriesTarget: 2200, updatedAt: Date()))
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayStatsEntry) -> Void) {
        completion(TodayStatsEntry(date: Date(), stats: SharedStatsStore.read()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayStatsEntry>) -> Void) {
        let entry = TodayStatsEntry(date: Date(), stats: SharedStatsStore.read())
        // The main app rewrites SharedStatsStore whenever Food data changes;
        // this just re-reads periodically in case the app hasn't been
        // opened in a while.
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

struct TodayStatsEntry: TimelineEntry {
    let date: Date
    let stats: TodayStats?
}

struct NobsWidgetView: View {
    var entry: TodayStatsEntry

    var body: some View {
        if let stats = entry.stats {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(stats.caloriesRemaining)")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.green)
                Text("kcal remaining")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text("\(stats.caloriesConsumed) / \(stats.caloriesTarget)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding()
        } else {
            VStack {
                Text("Open NoBSLifestyle")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
    }
}

struct NobsWidget: Widget {
    let kind: String = "NobsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayStatsProvider()) { entry in
            NobsWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Calories")
        .description("Shows how many calories you have left today.")
        .supportedFamilies([.systemSmall])
    }
}

@main
struct NobsWidgetBundle: WidgetBundle {
    var body: some Widget {
        NobsWidget()
    }
}
