"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getMyNotifications, markNotificationsRead } from "../actions/notification";
import { cn } from "@/lib/utils";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

/**
 * Lonceng notifikasi in-app di header (Tahap 2). Self-fetch: mengambil sendiri
 * lewat server action saat mount dan polling ringan tiap 30 detik, jadi tidak
 * perlu prop-drilling data notifikasi lewat kelima layout modul.
 */
export default function NotificationBell() {
  const [items, setItems] = React.useState([]);
  const [unread, setUnread] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  const load = React.useCallback(async () => {
    const res = await getMyNotifications();
    if (res.success) {
      setItems(res.data);
      setUnread(res.unread);
    }
  }, []);

  React.useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  // Tutup saat klik di luar panel.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Optimistik: nolkan badge, lalu tandai dibaca di server.
      setUnread(0);
      await markNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifikasi"
        className="relative cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="border-b px-4 py-2 text-sm font-medium">Notifikasi</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Belum ada notifikasi.
              </p>
            ) : (
              items.map((n) => {
                const body = (
                  <div
                    className={cn(
                      "border-b px-4 py-3 text-sm last:border-0",
                      !n.isRead && "bg-accent/40",
                    )}
                  >
                    <p className="leading-snug">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block hover:bg-accent">
                    {body}
                  </Link>
                ) : (
                  <div key={n.id}>{body}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
