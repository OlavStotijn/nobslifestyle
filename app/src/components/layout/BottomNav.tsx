import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "../../i18n/I18nContext";

const ICONS = {
  checklist: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <rect x="3" y="4" width="6" height="6" rx="1.5" />
      <path d="M4.5 7 6 8.5 8 6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="6" height="6" rx="1.5" />
      <path d="M12 7h9M12 17h9" strokeLinecap="round" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  food: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M6 2v7a2 2 0 0 0 2 2v11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 2v7M9 2v7" strokeLinecap="round" />
      <path d="M17 2c-1.7 0-3 2-3 5s1.3 5 3 5v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  workouts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <rect x="2" y="9" width="3" height="6" rx="1" />
      <rect x="19" y="9" width="3" height="6" rx="1" />
      <rect x="6" y="7" width="3" height="10" rx="1" />
      <rect x="15" y="7" width="3" height="10" rx="1" />
      <path d="M9 12h6" strokeLinecap="round" />
    </svg>
  ),
  feed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M4 4h10l6 6v10H4z" strokeLinejoin="round" />
      <path d="M8 12h8M8 16h8M8 8h4" strokeLinecap="round" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" strokeLinecap="round" />
    </svg>
  ),
};

const ITEMS = [
  { to: "/checklist", labelKey: "nav.checklist" as const, icon: ICONS.checklist },
  { to: "/food", labelKey: "nav.food" as const, icon: ICONS.food },
  { to: "/workouts", labelKey: "nav.workout" as const, icon: ICONS.workouts },
  { to: "/reports", labelKey: "nav.reports" as const, icon: ICONS.reports },
  { to: "/feed", labelKey: "nav.feed" as const, icon: ICONS.feed },
  { to: "/profile", labelKey: "nav.profile" as const, icon: ICONS.profile },
];

// Floating icon-only pill, not a full-width bar — active tab shown as a
// solid accent circle behind its icon rather than a text label underneath.
export function BottomNav() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface/90 px-2 py-2 shadow-lg backdrop-blur">
        {ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={t(item.labelKey)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full"
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active-indicator"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                />
              )}
              <span className={`relative z-10 transition-colors ${isActive ? "text-white" : "text-ink-muted"}`}>{item.icon}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
