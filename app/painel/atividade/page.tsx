"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Activity } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";

type AuditEvent = { id: number; occurredAt: string; actor?: { displayName?: string; email?: string } | null; action: string; entityType: string; entityId?: string };

export default function AtividadePage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    fetch(appPath(`/api/activity?days=${days}`), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { feed?: AuditEvent[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro");
        setEvents(body.feed ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Atividade" }]} />
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Atividade</h1><p className="text-sm text-gray-500 mt-1">Feed de auditoria e ações recentes</p></div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="text-sm border rounded-lg px-3 py-1.5 text-gray-600">
          <option value={3}>3 dias</option>
          <option value={7}>7 dias</option>
          <option value={14}>14 dias</option>
          <option value={30}>30 dias</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center"><Activity size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-400">Nenhuma atividade registrada no período.</p></div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                {(ev.actor?.displayName ?? ev.actor?.email ?? "S").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-900">
                  <span className="font-medium">{ev.actor?.displayName ?? ev.actor?.email ?? "Sistema"}</span>{" "}
                  <span className="text-gray-600">{ev.action}</span>{" "}
                  <span className="text-gray-500">{ev.entityType}{ev.entityId ? ` #${ev.entityId}` : ""}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{new Date(ev.occurredAt).toLocaleString("pt-BR")}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
