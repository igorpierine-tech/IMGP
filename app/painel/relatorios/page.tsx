"use client";

import { useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";

type PeriodStats = { projectsCreated: number; projectsCompleted: number; tasksCreated: number; tasksCompleted: number; demandsCreated: number; demandsResolved: number; minutesLogged: number };
type Variation = { absolute: number; percentage: number | null };
type Comparison = Record<string, Variation>;

const METRIC_LABELS: Record<string, string> = {
  projectsCreated: "Projetos criados",
  projectsCompleted: "Projetos concluídos",
  tasksCreated: "Tarefas criadas",
  tasksCompleted: "Tarefas concluídas",
  demandsCreated: "Demandas criadas",
  demandsResolved: "Demandas resolvidas",
  minutesLogged: "Minutos registrados",
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function VariationBadge({ v }: { v: Variation }) {
  if (v.absolute === 0) return <span className="flex items-center gap-1 text-gray-400 text-xs"><Minus size={12} /> Sem variação</span>;
  const up = v.absolute > 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {up ? "+" : ""}{v.absolute} {v.percentage !== null && <span className="text-gray-400">({v.percentage > 0 ? "+" : ""}{v.percentage}%)</span>}
    </span>
  );
}

export default function RelatoriosPage() {
  const now = new Date();
  const thisMonthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const thisMonthEnd = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const lastMonthStart = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));

  const [periodAStart, setPeriodAStart] = useState(lastMonthStart);
  const [periodAEnd, setPeriodAEnd] = useState(lastMonthEnd);
  const [periodBStart, setPeriodBStart] = useState(thisMonthStart);
  const [periodBEnd, setPeriodBEnd] = useState(thisMonthEnd);
  const [periodA, setPeriodA] = useState<PeriodStats | null>(null);
  const [periodB, setPeriodB] = useState<PeriodStats | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCompare(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ periodAStart, periodAEnd, periodBStart, periodBEnd });
      const r = await fetch(appPath(`/api/comparative-reports?${params}`), { credentials: "include" });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      setPeriodA(b.periodA); setPeriodB(b.periodB); setComparison(b.comparison);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumbs items={[{ label: "Análise" }, { label: "Relatórios Comparativos" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={24} className="text-[#0c4a3e]" /> Relatórios Comparativos</h1>
        <p className="text-sm text-gray-500 mt-1">Compare indicadores entre dois períodos</p>
      </div>

      <form onSubmit={handleCompare} className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Período A (referência)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">Início</label><input type="date" value={periodAStart} onChange={(e) => setPeriodAStart(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-gray-500">Fim</label><input type="date" value={periodAEnd} onChange={(e) => setPeriodAEnd(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Período B (atual)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">Início</label><input type="date" value={periodBStart} onChange={(e) => setPeriodBStart(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-gray-500">Fim</label><input type="date" value={periodBEnd} onChange={(e) => setPeriodBEnd(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <BarChart3 size={16} />} Comparar
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      {periodA && periodB && comparison && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(METRIC_LABELS).map((key) => {
            const a = (periodA as any)[key] as number;
            const b = (periodB as any)[key] as number;
            const v = (comparison as any)[key] as Variation;
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4">
                <div className="text-sm text-gray-500 mb-2">{METRIC_LABELS[key]}</div>
                <div className="flex items-end gap-4">
                  <div>
                    <div className="text-xs text-gray-400">Período A</div>
                    <div className="text-xl font-bold text-gray-600">{key === "minutesLogged" ? `${Math.round(a / 60)}h` : a}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Período B</div>
                    <div className="text-xl font-bold text-gray-900">{key === "minutesLogged" ? `${Math.round(b / 60)}h` : b}</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t"><VariationBadge v={v} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
