import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarkNotificationsRead, useNotifications } from "../api/hooks/useNotifications";
import { BottomSheet } from "./BottomSheet";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 13.5 6 9Z" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
    </svg>
  );
}

export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = data?.unreadCount ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          if (unread > 0) markRead.mutate();
        }}
        className="relative text-ink"
        aria-label="Notifications"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <h2 className="text-lg font-bold text-ink">Notifications</h2>
        <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto">
          {(data?.notifications ?? []).length === 0 && <p className="text-ink-muted">No notifications yet.</p>}
          {data?.notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                setOpen(false);
                if (n.link) navigate(n.link);
              }}
              className="rounded-xl border border-border bg-bg px-4 py-3 text-left"
            >
              <p className="font-medium text-ink">{n.title}</p>
              <p className="text-sm text-ink-muted">{n.body}</p>
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
