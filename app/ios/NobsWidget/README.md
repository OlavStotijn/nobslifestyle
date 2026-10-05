# Home screen widget — setup

The Swift source here is ready to use, but a WidgetKit extension is a separate Xcode *target*,
and creating one safely requires Xcode's own UI — hand-editing the `.pbxproj` for a new target
is too easy to get subtly wrong (many interlocking build-phase/config-list entries), so that
part wasn't done automatically.

## Steps

1. **Create the extension target**: Xcode → File → New → Target → **Widget Extension**.
   Name it `NobsWidget`. When it asks about an Intent configuration, choose **not** to include
   one (this widget is static, no user configuration).
2. Xcode will generate its own placeholder Swift files for the new target — **delete those**
   and instead add the two files in this folder (`SharedStats.swift`, `NobsWidget.swift`) to
   the new `NobsWidget` target (drag them into the target's group in the Project Navigator,
   or right-click → Add Files, making sure "NobsWidget" is checked in target membership).
3. Also add `SharedStats.swift` to the main **App** target's membership (select the file,
   check the "App" box too in the File Inspector's Target Membership section) — both the
   widget and `ios/App/App/WidgetBridgePlugin.swift` need the same `TodayStats`/`SharedStatsStore`
   definition.
4. **App Groups capability**, on *both* targets (App and NobsWidget): Signing & Capabilities →
   + Capability → App Groups → create/select `group.com.nobslifestyle.app` (must match exactly
   what's in `SharedStats.swift` and `WidgetBridgePlugin.swift`).
5. Build and run. The web app already calls the bridge from `FoodPage.tsx` on every load
   (`updateWidgetStats(...)` in `app/src/lib/widgetBridge.ts`) — once the above is wired up,
   today's remaining-calories number should start showing on the widget within a few seconds
   of opening the Food tab. Long-press the home screen → + → search "NoBSLifestyle" to add it.

## What this widget shows

A small (`systemSmall`) widget: calories remaining today, with consumed/target underneath.
`NobsWidgetView` in `NobsWidget.swift` is where to change the layout or add more stats later —
whatever you add there just needs the corresponding field added to `TodayStats` in
`SharedStats.swift` and written from `WidgetBridgePlugin.swift`/`widgetBridge.ts`.
