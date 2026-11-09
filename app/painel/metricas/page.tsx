"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, BarChart3, TrendingUp, Users, Clock } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

type MetricsData = {
  velocity?: { sprintName: string; pointsCompleted: number; tasksCompleted: number }[];
  sla?: { totalDemands: number; withinSla: number; slaRate: number; avgResolutionDays: number };
  productivity?: { userId: string; displayName: string; tasksCompleted: number; hoursLogged: number }[];
  burndown?: { date: string; remaining: number; ideal: number }[];
};

export default function MetricasPage() {
  const [metricType, setMetricType] = useState<"velocity" | "sla" | "productivity" | "burndown">("velocity");
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(appPath(`/api/metrics?type=${metricType}`), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { metrics?: MetricsData; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro");
        setData(body.metrics ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [metricType]);

  type ProdEntry = NonNullable<MetricsData["productivity"]>[number];
  const prodColumns: ColumnDef<ProdEntry>[] = [
    { key: "displayName", label: "Membro", sortable: true, getValue: (u) => u.displayName },
    { key: "tasksCompleted", label: "Tarefas", sortable: true, className: "text-right", getValue: (u) => u.tasksCompleted },
    { key: "hoursLogged", label: "Horas", sortable: true, className: "text-right", getValue: (u) => u.hoursLogged },
  ];
  const prodTable = useSortableTable<ProdEntry>(data?.productivity ?? []);
  const sortedProd = prodTable.sortAndFilter(data?.productivity ?? [], prodColumns);

  const tabs = [
    { key: "velocity" as const, label: "Velocidade", icon: TrendingUp },
    { key: "sla" as const, label: "SLA", icon: Clock },
    { key: "productivity" as const, label: "Produtividade", icon: Users },
    { key: "burndown" as const, label: "Burndown", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Métricas" }]} />
      <div><h1 className="text-2xl font-bold text-gray-900">Métricas</h1><p className="text-sm text-gray-500 mt-1">Indicadores de performance e produtividade</p></div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setMetricType(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${metricType === tab.key ? "bg-[#0c4a3e] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
              <Icon size={16} />{tab.label}
            </button>
          );
        })}
      </div>

      {loading && <div className="flex items-center justify-center h-48 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>}

      {!loading && !error && data && (
        <div className="bg-white rounded-xl border p-5">
          {metricType === "velocity" && (
            <>
              <h2 className="text-lg font-semibold mb-4">Velocidade por Sprint</h2>
              {data.velocity && data.velocity.length > 0 ? (
                <div className="space-y-3">
                  {data.velocity.map((s, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 w-32 truncate">{s.sprintName}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                        <div className="bg-[#0c4a3e] h-6 rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.min(100, (s.tasksCompleted / Math.max(1, ...data.velocity!.map(v => v.tasksCompleted))) * 100)}%` }}>
                          <span className="text-xs text-white font-medium">{s.tasksCompleted}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Sem dados de velocidade.</p>}
            </>
          )}

          {metricType === "sla" && data.sla && (
            <>
              <h2 className="text-lg font-semibold mb-4">Indicadores de SLA</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg"><div className="text-3xl font-bold text-gray-900">{data.sla.totalDemands}</div><div className="text-sm text-gray-500">Total demandas</div></div>
                <div className="text-center p-4 bg-gray-50 rounded-lg"><div className="text-3xl font-bold text-emerald-600">{data.sla.withinSla}</div><div className="text-sm text-gray-500">Dentro do SLA</div></div>
                <div className="text-center p-4 bg-gray-50 rounded-lg"><div className="text-3xl font-bold text-blue-600">{data.sla.slaRate}%</div><div className="text-sm text-gray-500">Taxa de SLA</div></div>
                <div className="text-center p-4 bg-gray-50 rounded-lg"><div className="text-3xl font-bold text-gray-900">{data.sla.avgResolutionDays}d</div><div className="text-sm text-gray-500">Tempo médio resolução</div></div>
              </div>
            </>
          )}

          {metricType === "productivity" && (
            <>
              <h2 className="text-lg font-semibold mb-4">Produtividade da Equipe</h2>
              {data.productivity && data.productivity.length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left">
                    {prodColumns.map((col) => (
                      <SortableHeader key={col.key} label={col.label} sortDir={prodTable.getSortDir(col.key)} onSort={() => prodTable.toggleSort(col.key)}
                        sortable={col.sortable} className={col.className ?? ""} />
                    ))}
                  </tr></thead>
                  <tbody>
                    {sortedProd.map((u) => (
                      <tr key={u.userId} className="border-b last:border-0"><td className="py-2 font-medium text-gray-900">{u.displayName}</td><td className="py-2 text-right">{u.tasksCompleted}</td><td className="py-2 text-right">{u.hoursLogged}h</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-gray-400">Sem dados de produtividade.</p>}
            </>
          )}

          {metricType === "burndown" && (
            <>
              <h2 className="text-lg font-semibold mb-4">Burndown</h2>
              {data.burndown && data.burndown.length > 0 ? (
                <div className="space-y-1">
                  {data.burndown.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500 w-24">{d.date}</span>
                      <div className="flex-1 flex gap-2 items-center">
                        <div className="flex-1 bg-gray-100 rounded-full h-3">
                          <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.min(100, (d.remaining / Math.max(1, data.burndown![0].remaining)) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">{d.remaining}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Sem dados de burndown.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
