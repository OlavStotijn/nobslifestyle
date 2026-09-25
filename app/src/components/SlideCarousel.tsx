import { useRef, useState, type ReactNode } from "react";

// Native CSS scroll-snap carousel — swipe works for free on touch devices,
// no drag-physics library needed. Used for feed posts that have a photo
// attached: slide one is the photo, slide two is the workout/run stats.
export function SlideCarousel({ slides }: { slides: ReactNode[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            {slide}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === active ? "bg-accent" : "bg-surface-2"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
