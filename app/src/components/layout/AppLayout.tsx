import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

// Wraps the five main tab sections only — focused flows (onboarding, the
// session runner, schema editing, adding food/friends) render full-screen
// without the tab bar, matching how most mobile apps hide chrome during a
// task and bring it back on the sections you jump between.
export function AppLayout() {
  return (
    <div className="pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
}
