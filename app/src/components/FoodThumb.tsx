// Shared thumbnail for anywhere a food item shows up as a row (search
// results, log entries, the quantity picker) — falls back to a plain icon
// tile for items with no photo (most OFF barcode items have one; manual/OCR
// items only do if the user attached one).
export function FoodThumb({ url, size = 44 }: { url: string | null; size?: number }) {
  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-lg bg-surface-2 text-lg"
        aria-hidden="true"
      >
        🍽️
      </div>
    );
  }
  return <img src={url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-lg object-cover" />;
}
