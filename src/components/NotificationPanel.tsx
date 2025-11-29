import { Notification } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface Props {
  notifications: Notification[];
  onMarkRead?: (id: string) => void;
}

export function NotificationPanel({ notifications, onMarkRead }: Props) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Realtime</p>
          <p className="text-lg font-semibold text-white">Notifications</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">
          {notifications.filter((n) => !n.is_read).length} unread
        </span>
      </div>
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {notifications.length === 0 && (
          <p className="text-sm text-slate-400">No notifications yet.</p>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-sm shadow-black/20"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <p className="text-sm font-semibold text-white">{n.title}</p>
              </div>
              <p className="text-[11px] text-slate-400">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-300">{n.message}</p>
            {n.account_number && (
              <p className="text-[11px] text-slate-500 mt-1">Acct {n.account_number}</p>
            )}
            {!n.is_read && onMarkRead && (
              <button
                className="mt-2 text-xs text-cyan-300 underline-offset-4 hover:underline"
                onClick={() => onMarkRead(n.id)}
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
