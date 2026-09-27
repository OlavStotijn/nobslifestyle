import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useChecklistItem,
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useUpdateChecklistItem,
  type ChecklistRecurrence,
} from "../api/hooks/useChecklist";
import { useSearchFood, todayLocalDate, type FoodItem } from "../api/hooks/useFoodLogs";
import { useSchemas } from "../api/hooks/useWorkouts";
import { useFriends } from "../api/hooks/useSocial";
import { useDebounced } from "../hooks/useDebounced";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function FoodPicker({ onSelect }: { onSelect: (item: FoodItem) => void }) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 350);
  const { data: results } = useSearchFood(debounced);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a food…"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
      />
      {results && results.length > 0 && debounced.trim().length > 1 && (
        <div className="mt-2 flex flex-col gap-1">
          {results.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-ink"
            >
              {item.name} {item.brand && <span className="text-ink-muted">· {item.brand}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChecklistFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id != null;
  const { data: existing } = useChecklistItem(isEdit ? Number(id) : undefined);

  const { data: schemas } = useSchemas();
  const { data: friends } = useFriends();
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<ChecklistRecurrence>("none");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [reminderTime, setReminderTime] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [linkedWorkoutSchemaId, setLinkedWorkoutSchemaId] = useState<number | undefined>(undefined);
  const [linkedFoodItem, setLinkedFoodItem] = useState<FoodItem | null>(null);
  // Tracks the existing linked food item (id + display name only) separately
  // from a freshly picked one, and whether the user explicitly cleared it —
  // so "no change made" still submits the original id rather than null.
  const [existingFoodItemCleared, setExistingFoodItemCleared] = useState(false);
  const [collaboratorUserId, setCollaboratorUserId] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setNotes(existing.notes ?? "");
    setRecurrence(existing.recurrence);
    setWeekdays(existing.recurrenceWeekdays);
    setReminderTime(existing.reminderTime ?? "");
    setDeadlineTime(existing.deadlineTime ?? "");
    setLinkedWorkoutSchemaId(existing.linkedWorkoutSchemaId ?? undefined);
  }, [existing]);

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  const pending = createItem.isPending || updateItem.isPending || deleteItem.isPending;

  async function submit() {
    if (!title.trim()) {
      setError("Give this item a title.");
      return;
    }
    if (recurrence === "weekly" && weekdays.length === 0) {
      setError("Pick at least one day of the week.");
      return;
    }
    setError(null);

    try {
      if (isEdit) {
        await updateItem.mutateAsync({
          id: Number(id),
          title: title.trim(),
          notes: notes.trim() || null,
          reminderTime: reminderTime || null,
          deadlineTime: deadlineTime || null,
          linkedWorkoutSchemaId: linkedWorkoutSchemaId ?? null,
          linkedFoodItemId: linkedFoodItem ? linkedFoodItem.id : existingFoodItemCleared ? null : existing?.linkedFoodItemId ?? null,
        });
      } else {
        await createItem.mutateAsync({
          title: title.trim(),
          notes: notes.trim() || undefined,
          startDate: todayLocalDate(),
          recurrence,
          recurrenceWeekdays: recurrence === "weekly" ? weekdays : undefined,
          reminderTime: reminderTime || undefined,
          deadlineTime: deadlineTime || undefined,
          linkedWorkoutSchemaId,
          linkedFoodItemId: linkedFoodItem?.id,
          collaboratorUserId,
        });
      }
      navigate("/checklist");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!window.confirm("Delete this checklist item?")) return;
    await deleteItem.mutateAsync(Number(id));
    navigate("/checklist");
  }

  return (
    <div className="flex min-h-full flex-col bg-bg px-6 py-8">
      <button type="button" onClick={() => navigate("/checklist")} className="self-start text-sm text-ink-muted">
        ← Cancel
      </button>

      <h1 className="mt-4 text-2xl font-bold text-ink">{isEdit ? "Edit item" : "New checklist item"}</h1>

      <div className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto pb-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>

        {!isEdit && (
          <div>
            <span className="text-sm font-medium text-ink-muted">Repeat</span>
            <div className="mt-1.5 flex gap-2">
              {(["none", "daily", "weekly"] as ChecklistRecurrence[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecurrence(r)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize ${
                    recurrence === r ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-ink"
                  }`}
                >
                  {r === "none" ? "Once" : r}
                </button>
              ))}
            </div>
            {recurrence === "weekly" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                      weekdays.includes(day) ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Reminder (optional)</span>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Deadline (optional)</span>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Link a workout (optional)</span>
          <select
            value={linkedWorkoutSchemaId ?? ""}
            onChange={(e) => setLinkedWorkoutSchemaId(e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
          >
            <option value="">None</option>
            {schemas?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Link a food item (optional)</span>
          {linkedFoodItem ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <span className="text-sm text-ink">{linkedFoodItem.name}</span>
              <button
                type="button"
                onClick={() => {
                  setLinkedFoodItem(null);
                  setExistingFoodItemCleared(true);
                }}
                className="text-sm text-ink-muted"
              >
                Remove
              </button>
            </div>
          ) : existing?.linkedFoodItemId && !existingFoodItemCleared ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <span className="text-sm text-ink">{existing.linkedFoodItemName ?? "Linked food item"}</span>
              <button type="button" onClick={() => setExistingFoodItemCleared(true)} className="text-sm text-ink-muted">
                Change
              </button>
            </div>
          ) : (
            <FoodPicker onSelect={setLinkedFoodItem} />
          )}
        </div>

        {!isEdit && friends && friends.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Tag a friend to do this together (optional)</span>
            <select
              value={collaboratorUserId ?? ""}
              onChange={(e) => setCollaboratorUserId(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
            >
              <option value="">None</option>
              {friends.map((f) => (
                <option key={f.user.id} value={f.user.id}>
                  {f.user.displayName}
                </option>
              ))}
            </select>
            <span className="text-xs text-ink-muted">They'll need to accept before it counts as shared.</span>
          </label>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="mt-2 rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add to checklist"}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-xl border border-border px-4 py-3 text-center font-semibold text-red-500 transition-opacity disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
