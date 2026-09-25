import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  facingMode?: "environment" | "user";
}

// Generic still-frame capture over getUserMedia — reused for the nutrition
// label OCR flow now, and for avatar photos later. Distinct from
// BarcodeScanner, which continuously decodes frames instead of taking one.
export function CameraCapture({ onCapture, facingMode = "environment" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Couldn't access the camera. Check permissions and try again."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, "image/jpeg", 0.85);
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="aspect-[3/4] w-full object-cover" />
      </div>
      <button
        type="button"
        onClick={capture}
        className="h-16 w-16 rounded-full border-4 border-accent bg-surface"
        aria-label="Take photo"
      />
    </div>
  );
}
