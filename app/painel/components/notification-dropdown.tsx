"use client";

import { useEffect, useState, useRef } from "react";
import { appPath } from "@/lib/app-path";
import { Bell, Check, Loader2 } from "lucide-react";

type Notification = {
  id: number; type: string; title: string; body?: string;
  read: boolean; createdAt: string; entityType?: string; entityId?: string;
};

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchCount() {
    try {
      const r = await fetch(appPath("/api/notifications?unread=1&limit=1"), { credentials: "include" });
      const body = await r.json() as { unreadCount: number };
      setUnreadCount(body.unreadCount ?? 0);
    } catch {}
  }

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true); setLoading(true);
    try {
      const r = await fetch(appPath("/api/notifications?limit=20"), { credentials: "include" });
      const body = await r.json() as { notifications: Notification[]; unreadCount: number };
      setNotifications(body.notifications ?? []);
      setUnreadCount(body.unreadCount ?? 0);
    } catch {}
    finally { setLoading(false); }
  }

  async function markAllRead() {
    try {
      await fetch(appPath("/api/notifications"), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  function timeAgo(dt: string) {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border shadow-lg z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-sm font-semibold text-gray-900">Notificações</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#0c4a3e] hover:underline flex items-center gap-1">
                <Check size={12} /> Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">Nenhuma notificação</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b last:border-0 ${!n.read ? "bg-blue-50/50" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">{n.title}</div>
                      {n.body && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>}
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
