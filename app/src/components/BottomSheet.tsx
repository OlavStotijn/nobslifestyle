import type { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-6 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-2" />
        {children}
      </div>
    </div>
  );
}
