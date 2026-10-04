import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { ApiError } from "../api/client";
import { useBlockUser, useReport, type ReportReason, type ReportTargetType } from "../api/hooks/useSafety";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
];

type Step = "menu" | "reason" | "block" | "reported";

interface Props {
  targetType: ReportTargetType;
  targetId: number;
  authorId: number;
  authorName: string;
  label?: string;
  onBlocked?: () => void;
}

// The "⋯" entry point for App Store guideline 1.2: report content and block
// its author from one place.
export function ReportBlockMenu({ targetType, targetId, authorId, authorName, label = "More options", onBlocked }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("menu");
  const [error, setError] = useState<string | null>(null);
  const report = useReport();
  const block = useBlockUser();

  function close() {
    setOpen(false);
    setStep("menu");
    setError(null);
  }

  async function submitReport(reason: ReportReason) {
    setError(null);
    try {
      await report.mutateAsync({ targetType, targetId, reason });
      setStep("reported");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send report.");
    }
  }

  async function confirmBlock() {
    setError(null);
    try {
      await block.mutateAsync(authorId);
      close();
      onBlocked?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't block user.");
    }
  }

  const noun = targetType === "user" ? "user" : targetType;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} className="px-1 text-lg leading-none text-ink-muted">
        ⋯
      </button>
      <BottomSheet open={open} onClose={close}>
        {step === "menu" && (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setStep("reason")} className="rounded-xl border border-border px-4 py-3 text-left font-medium text-ink">
              Report {noun}
            </button>
            <button type="button" onClick={() => setStep("block")} className="rounded-xl border border-border px-4 py-3 text-left font-medium text-red-500">
              Block {authorName}
            </button>
            <button type="button" onClick={close} className="px-4 py-2 text-sm text-ink-muted">
              Cancel
            </button>
          </div>
        )}

        {step === "reason" && (
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-ink">Why are you reporting this {noun}?</h3>
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                disabled={report.isPending}
                onClick={() => submitReport(r.value)}
                className="rounded-xl border border-border px-4 py-3 text-left font-medium text-ink disabled:opacity-50"
              >
                {r.label}
              </button>
            ))}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="button" onClick={() => setStep("menu")} className="px-4 py-2 text-sm text-ink-muted">
              Back
            </button>
          </div>
        )}

        {step === "block" && (
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-ink">Block {authorName}?</h3>
            <p className="text-sm text-ink-muted">
              You won't see each other's posts or comments, and any friendship between you will be removed. You can unblock
              them later in Settings.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              onClick={confirmBlock}
              disabled={block.isPending}
              className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {block.isPending ? "Blocking…" : "Block"}
            </button>
            <button type="button" onClick={() => setStep("menu")} className="px-4 py-2 text-sm text-ink-muted">
              Cancel
            </button>
          </div>
        )}

        {step === "reported" && (
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-ink">Thanks for letting us know</h3>
            <p className="text-sm text-ink-muted">We'll review this report. You can also block {authorName} so you stop seeing their content.</p>
            <button type="button" onClick={() => setStep("block")} className="rounded-xl border border-border px-4 py-3 font-medium text-red-500">
              Block {authorName}
            </button>
            <button type="button" onClick={close} className="px-4 py-2 text-sm text-ink-muted">
              Done
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
