// Original, simplified front-view body illustration (not traced from any
// reference image) used as a tappable muscle-group picker. Only categories
// that are actually visible from the front get a hotspot — "back" lives in
// the category list instead, since it isn't visible here.

const FRONT_CATEGORIES = ["shoulders", "chest", "arms", "core", "legs"] as const;
export type FrontCategory = (typeof FRONT_CATEGORIES)[number];

interface Region {
  category: FrontCategory;
  label: string;
  path: string;
}

// Regions are mirrored (left+right) into one path each so a single tap
// covers either side of the body.
const REGIONS: Region[] = [
  {
    category: "shoulders",
    label: "Shoulders",
    path: "M60,86 C48,88 38,98 34,114 C32,122 32,130 36,136 C44,138 52,132 56,120 C59,110 61,98 66,90 Z M180,86 C192,88 202,98 206,114 C208,122 208,130 204,136 C196,138 188,132 184,120 C181,110 179,98 174,90 Z",
  },
  {
    category: "chest",
    label: "Chest",
    path: "M76,90 C92,82 108,80 120,80 C132,80 148,82 164,90 L162,132 C148,142 134,146 120,146 C106,146 92,142 78,132 Z",
  },
  {
    category: "arms",
    label: "Arms",
    path: "M36,140 C33,168 32,196 34,224 C35,236 52,236 53,224 C55,198 57,170 58,142 C50,146 42,146 36,140 Z M204,140 C207,168 208,196 206,224 C205,236 188,236 187,224 C185,198 183,170 182,142 C190,146 198,146 204,140 Z",
  },
  {
    category: "core",
    label: "Core",
    path: "M80,136 C93,144 106,148 120,148 C134,148 147,144 160,136 L156,214 C144,224 132,229 120,229 C108,229 96,224 84,214 Z",
  },
  {
    category: "legs",
    label: "Legs",
    path: "M84,218 C82,270 79,326 76,388 C75,412 74,436 76,456 C77,464 93,464 95,456 C98,422 101,370 105,320 C107,290 109,260 111,232 C102,234 92,228 84,218 Z M156,218 C158,270 161,326 164,388 C165,412 166,436 164,456 C163,464 147,464 145,456 C142,422 139,370 135,320 C133,290 131,260 129,232 C138,234 148,228 156,218 Z",
  },
];

export function MuscleBodyDiagram({ selected, onSelect }: { selected: string | null; onSelect: (category: FrontCategory) => void }) {
  return (
    <svg viewBox="0 0 240 480" className="mx-auto h-full max-h-[420px] w-auto text-ink-muted" role="img" aria-label="Front view body diagram">
      {/* Silhouette (decorative, not interactive) */}
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" opacity={0.5}>
        <circle cx="120" cy="42" r="26" />
        <path d="M108,64 L108,80 M132,64 L132,80" />
        <path d="M66,90 C90,80 150,80 174,90 L182,136 C186,166 208,196 206,224 C205,236 188,236 187,224 C185,198 183,170 182,142 L184,136 C179,144 172,148 164,150 L160,214 C160,222 158,228 156,232 L164,388 C166,412 167,436 165,456 C164,464 148,464 146,456 C143,422 140,370 136,320 C133,286 130,254 129,232 L111,232 C110,254 107,286 104,320 C100,370 97,422 94,456 C93,464 77,464 76,456 C74,436 75,412 76,388 L84,232 C82,228 81,222 80,214 L76,150 C68,148 61,144 56,136 L58,142 C57,170 55,198 53,224 C52,236 35,236 34,224 C32,196 33,166 36,136 L44,90 Z" />
      </g>

      {REGIONS.map((r) => {
        const isSelected = selected === r.category;
        return (
          <path
            key={r.category}
            d={r.path}
            onClick={() => onSelect(r.category)}
            role="button"
            aria-label={r.label}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(r.category);
            }}
            className={`cursor-pointer transition-colors focus:outline-none ${
              isSelected ? "fill-accent/60 stroke-accent" : "fill-accent-soft/70 stroke-accent-soft hover:fill-accent/30"
            }`}
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}

export { FRONT_CATEGORIES };
