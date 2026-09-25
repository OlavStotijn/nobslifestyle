import { NavLink } from "react-router-dom";

const ICONS = {
  summary: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
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
  { to: "/summary", label: "Summary", icon: ICONS.summary },
  { to: "/food", label: "Food", icon: ICONS.food },
  { to: "/workouts", label: "Workout", icon: ICONS.workouts },
  { to: "/feed", label: "Feed", icon: ICONS.feed },
  { to: "/profile", label: "Profile", icon: ICONS.profile },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium ${
                isActive ? "text-accent" : "text-ink-muted"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
