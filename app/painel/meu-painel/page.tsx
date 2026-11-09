"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, CheckCircle2, Clock, AlertTriangle, Bell, Star } from "lucide-react";
import { TimeTrackerButton } from "../components/time-tracker";

type MyDashboard = {
  myTasks: Array<{ id: number; name: string; status: string; health: string; projectName?: string; plannedEnd?: string }>;
  upcomingDeadlines: Array<{ id: number; name: string; plannedEnd: string; daysRemaining: number }>;
  recentTimeEntries: Array<{ id: number; activity?: string; totalMinutes?: number; projectName?: string }>;
  notifications: Array<{ id: number; title: string; message: string; read: boolean; createdAt: string }>;
  favorites: Array<{ id: number; entityType: string; entityId: number; entityName?: string }>;
};

export default function MeuPainelPage() {
  const [data, setData] = useState<MyDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(appPath("/api/my-dashboard"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as Record<string, any>;
        if (!r.ok) throw new Error(body.error ?? "Erro");
        setData({
          myTasks: body.myTasks ?? [],
          upcomingDeadlines: body.upcomingDeadlines ?? [],
          recentTimeEntries: body.recentTimeEntries ?? [],
          notifications: body.recentNotifications ?? [],
          favorites: body.favorites ?? [],
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  if (!data && !error) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  const d = data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Meu Painel</h1><p className="text-sm text-gray-500 mt-1">Suas tarefas, prazos e atividade recente</p></div>
        <TimeTrackerButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-blue-500" /> Minhas tarefas</h2>
          {d.myTasks.length === 0 ? <p className="text-sm text-gray-400">Nenhuma tarefa atribuída.</p> : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {d.myTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${t.health === "on_track" ? "bg-emerald-500" : t.health === "attention" ? "bg-amber-500" : "bg-red-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.projectName ?? ""} · {t.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Próximos prazos</h2>
          {d.upcomingDeadlines.length === 0 ? <p className="text-sm text-gray-400">Nenhum prazo próximo.</p> : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {d.upcomingDeadlines.map((dl) => (
                <div key={dl.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{dl.name}</div>
                    <div className="text-xs text-gray-400">{dl.plannedEnd}</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dl.daysRemaining <= 2 ? "bg-red-100 text-red-700" : dl.daysRemaining <= 5 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                    {dl.daysRemaining}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock size={18} className="text-purple-500" /> Horas recentes</h2>
          {d.recentTimeEntries.length === 0 ? <p className="text-sm text-gray-400">Nenhum lançamento recente.</p> : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {d.recentTimeEntries.map((te) => (
                <div key={te.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0"><div className="text-sm text-gray-700 truncate">{te.activity ?? "Sem atividade"}</div><div className="text-xs text-gray-400">{te.projectName}</div></div>
                  <span className="text-sm font-medium text-gray-900">{te.totalMinutes ? `${Math.round(te.totalMinutes / 60)}h` : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Bell size={18} className="text-gray-500" /> Notificações</h2>
          {d.notifications.length === 0 ? <p className="text-sm text-gray-400">Nenhuma notificação.</p> : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {d.notifications.map((n) => (
                <div key={n.id} className={`py-2 border-b border-gray-50 last:border-0 ${!n.read ? "bg-blue-50/50 -mx-2 px-2 rounded" : ""}`}>
                  <div className="text-sm font-medium text-gray-900">{n.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
