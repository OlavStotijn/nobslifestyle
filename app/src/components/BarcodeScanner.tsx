import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
}

// Client-side only: decodes barcodes straight from the device camera via
// getUserMedia, no server round-trip needed for the scan itself — the
// resulting code is then looked up through /api/food/barcode/:code.
export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result) => {
          if (result && !cancelled) {
            cancelled = true;
            controls?.stop();
            onDetected(result.getText());
          }
        }
      )
      .then((c) => {
        controls = c;
      })
      .catch(() => setError("Couldn't access the camera. Check permissions and try again."));

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
      <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-accent" />
    </div>
  );
}
