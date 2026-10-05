import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { ApiError } from "../api/client";
import { useBlockUser, useReport, type ReportReason, type ReportTargetType } from "../api/hooks/useSafety";
import { useFriends, useRemoveFriend } from "../api/hooks/useSocial";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
];

type Step = "menu" | "reason" | "block" | "remove" | "reported";

interface Props {
  targetType: ReportTargetType;
  targetId: number;
  authorId: number;
  authorName: string;
  label?: string;
  // Fires after a block OR a friend removal — both end the relationship
  // between the two users, so callers that navigate away from a
  // now-invalid page (e.g. a friend's profile) only need to handle it once.
  onBlocked?: () => void;
}

// The "⋯" entry point for App Store guideline 1.2: report content and block
// its author from one place. Also offers unfriending — softer than a block,
// since every author reachable from here (feed posts, a friend's profile)
// is, by definition, a current friend.
export function ReportBlockMenu({ targetType, targetId, authorId, authorName, label = "More options", onBlocked }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("menu");
  const [error, setError] = useState<string | null>(null);
  const report = useReport();
  const block = useBlockUser();
  const removeFriend = useRemoveFriend();
  const { data: friends } = useFriends();
  const friendshipId = friends?.find((f) => f.user.id === authorId)?.friendshipId;

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

  async function confirmRemoveFriend() {
    if (!friendshipId) return;
    setError(null);
    try {
      await removeFriend.mutateAsync(friendshipId);
      close();
      onBlocked?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove friend.");
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
            {friendshipId != null && (
              <button type="button" onClick={() => setStep("remove")} className="rounded-xl border border-border px-4 py-3 text-left font-medium text-ink">
                Remove {authorName} as a friend
              </button>
            )}
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

        {step === "remove" && (
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-ink">Remove {authorName} as a friend?</h3>
            <p className="text-sm text-ink-muted">
              You'll stop seeing each other's posts in the feed. They won't be notified, and you can send a new friend
              request later if you change your mind.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              onClick={confirmRemoveFriend}
              disabled={removeFriend.isPending}
              className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {removeFriend.isPending ? "Removing…" : "Remove friend"}
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
