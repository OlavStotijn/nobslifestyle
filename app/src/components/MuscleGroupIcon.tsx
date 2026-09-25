import type { ReactElement } from "react";

const ICONS: Record<string, ReactElement> = {
  chest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-full w-full">
      <path d="M4 8c0-2.2 1.8-4 4-4 1.7 0 3.2 1 3.8 2.5" strokeLinecap="round" />
      <path d="M20 8c0-2.2-1.8-4-4-4-1.7 0-3.2 1-3.8 2.5" strokeLinecap="round" />
      <path d="M4 8v3c0 4 3.2 8 8 9 4.8-1 8-5 8-9V8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6.5V20" strokeLinecap="round" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-full w-full">
      <path d="M12 3v18" strokeLinecap="round" />
      <path d="M12 4c-3 2-7 3-8 3 0 6 2 10 8 13 6-3 8-7 8-13-1 0-5-1-8-3Z" strokeLinejoin="round" />
    </svg>
  ),
  shoulders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-full w-full">
      <circle cx="5.5" cy="8" r="2.8" />
      <circle cx="18.5" cy="8" r="2.8" />
      <path d="M8 9.5c1.2 1 2.6 1.5 4 1.5s2.8-.5 4-1.5" strokeLinecap="round" />
      <path d="M12 11v9" strokeLinecap="round" />
    </svg>
  ),
  arms: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-full w-full">
      <path d="M5 5c0 3 1.5 5 4 5.5" strokeLinecap="round" />
      <circle cx="10.5" cy="9" r="3" />
      <path d="M12.5 11.5 17 16" strokeLinecap="round" />
      <path d="M17 16c1 1 1 2.5 0 3.5s-2.5 1-3.5 0" strokeLinecap="round" />
    </svg>
  ),
  legs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-full w-full">
      <path d="M9 3h6l.5 8-1 10h-2l-.5-8-1-.5-1 .5-.5 8h-2l-1-10Z" strokeLinejoin="round" />
    </svg>
  ),
  core: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-full w-full">
      <rect x="7" y="3" width="10" height="18" rx="3" />
      <path d="M7 8h10M7 13h10M7 18h10" strokeLinecap="round" />
      <path d="M12 3v18" strokeLinecap="round" />
    </svg>
  ),
  cardio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-full w-full">
      <path
        d="M12 20 4.5 12.8C2.5 10.8 2.5 7.8 4.5 5.9c2-1.9 5-1.7 6.8.3l.7.8.7-.8c1.8-2 4.8-2.2 6.8-.3 2 1.9 2 4.9 0 6.9Z"
        strokeLinejoin="round"
      />
      <path d="M6 12h2.5l1.5-3 2 5 1.5-2.5H16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  full_body: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-full w-full">
      <circle cx="12" cy="4.5" r="2.3" />
      <path d="M6 21l1.5-8L5 10l1-3h12l1 3-2.5 3 1.5 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13h6" strokeLinecap="round" />
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-full w-full">
      <rect x="2" y="9" width="3" height="6" rx="1" />
      <rect x="19" y="9" width="3" height="6" rx="1" />
      <rect x="6" y="7" width="3" height="10" rx="1" />
      <rect x="15" y="7" width="3" height="10" rx="1" />
      <path d="M9 12h6" strokeLinecap="round" />
    </svg>
  ),
};

export const CATEGORY_ORDER = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio", "full_body", "other"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
  cardio: "Cardio",
  full_body: "Full body",
  other: "Other",
};

export function normalizeCategory(category: string | null | undefined): string {
  if (!category) return "other";
  return category in ICONS ? category : "other";
}

export function MuscleGroupIcon({ category, className }: { category: string | null | undefined; className?: string }) {
  const key = normalizeCategory(category);
  return <span className={className}>{ICONS[key]}</span>;
}
