import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { todayLocalDate } from "../api/hooks/useFoodLogs";
import {
  useChecklistItems,
  usePendingChecklistInvites,
  useRespondToChecklistInvite,
  useShareChecklist,
  useToggleChecklistItem,
  type ChecklistItemInstance,
} from "../api/hooks/useChecklist";

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string, today: string): string {
  if (dateStr === today) return "Today";
  if (dateStr === addDays(today, -1)) return "Yesterday";
  if (dateStr === addDays(today, 1)) return "Tomorrow";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function ItemRow({ item, isOwner, onToggle }: { item: ChecklistItemInstance; isOwner: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const hasCollab = item.participants.length > 1 || item.pendingCollaborators.length > 0;

  const body = (
    <>
      <p className={`truncate font-medium ${item.done ? "text-ink-muted line-through" : "text-ink"}`}>{item.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        {item.reminderTime && <span>⏰ {item.reminderTime}</span>}
        {item.deadlineTime && <span>⏳ due {item.deadlineTime}</span>}
        {item.linkedWorkoutSchemaName && <span>🏋️ {item.linkedWorkoutSchemaName}</span>}
        {item.linkedFoodItemName && <span>🍽️ {item.linkedFoodItemName}</span>}
      </div>
      {hasCollab && (
        <div className="mt-1 flex flex-wrap gap-1">
          {item.participants.map((p) => (
            <span
              key={p.userId}
              className={`rounded-full px-2 py-0.5 text-[11px] ${p.completed ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-muted"}`}
            >
              {p.displayName} {p.completed ? "✓" : "…"}
            </span>
          ))}
          {item.pendingCollaborators.map((p) => (
            <span key={p.collaboratorId} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-muted">
              {p.displayName} (invited)
            </span>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.myCompleted ? "Mark incomplete" : "Mark complete"}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
          item.myCompleted ? "border-accent bg-accent text-white" : "border-border"
        }`}
      >
        {item.myCompleted && "✓"}
      </button>

      {isOwner ? (
        <button type="button" onClick={() => navigate(`/checklist/${item.id}/edit`)} className="min-w-0 flex-1 text-left">
          {body}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}
    </div>
  );
}

export function ChecklistPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = todayLocalDate();
  const [date, setDate] = useState(today);

  const { data, isLoading } = useChecklistItems(date);
  const { data: invites } = usePendingChecklistInvites();
  const toggle = useToggleChecklistItem(date);
  const respond = useRespondToChecklistInvite();
  const share = useShareChecklist();
  const [shared, setShared] = useState(false);

  const items = data?.items ?? [];
  const doneCount = items.filter((i) => i.done).length;

  async function handleShare() {
    await share.mutateAsync(date);
    setShared(true);
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Checklist</h1>
      </div>

      {invites && invites.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {invites.map((inv) => (
            <div key={inv.collaboratorId} className="rounded-xl border border-accent bg-accent-soft px-4 py-3">
              <p className="text-sm text-ink">
                <span className="font-semibold">{inv.ownerDisplayName}</span> wants you to join &ldquo;{inv.title}&rdquo;
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => respond.mutate({ collaboratorId: inv.collaboratorId, accept: true })}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => respond.mutate({ collaboratorId: inv.collaboratorId, accept: false })}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, -1))}
          className="rounded-full border border-border px-3 py-1.5 text-sm text-ink-muted"
        >
          ←
        </button>
        <h2 className="text-lg font-bold text-ink">{formatDateLabel(date, today)}</h2>
        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, 1))}
          className="rounded-full border border-border px-3 py-1.5 text-sm text-ink-muted"
        >
          →
        </button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto pb-24">
        {isLoading && <p className="text-center text-ink-muted">Loading…</p>}
        {!isLoading && items.length === 0 && <p className="text-center text-ink-muted">Nothing on the list for this day.</p>}
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} isOwner={item.ownerUserId === user?.id} onToggle={() => toggle.mutate(item.id)} />
          ))}
        </div>

        {items.length > 0 && date === today && (
          <button
            type="button"
            onClick={handleShare}
            disabled={share.isPending || shared}
            className="mt-4 w-full rounded-xl border border-border px-4 py-3 text-center font-semibold text-ink transition-opacity disabled:opacity-60"
          >
            {shared ? `Shared ✓ (${doneCount}/${items.length} done)` : "Share today's progress"}
          </button>
        )}
      </div>

      <motion.button
        type="button"
        onClick={() => navigate("/checklist/new")}
        whileTap={{ scale: 0.88 }}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white shadow-lg"
        aria-label="Add checklist item"
      >
        +
      </motion.button>
    </div>
  );
}
