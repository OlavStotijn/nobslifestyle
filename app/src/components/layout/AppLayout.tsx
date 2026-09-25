import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNav } from "./BottomNav";

// Wraps the five main tab sections only — focused flows (onboarding, the
// session runner, schema editing, adding food/friends) render full-screen
// without the tab bar, matching how most mobile apps hide chrome during a
// task and bring it back on the sections you jump between. BottomNav lives
// outside the animated region so it never flickers on a tab switch — only
// the page content fades/slides.
export function AppLayout() {
  const location = useLocation();

  return (
    <div className="pb-20">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}
