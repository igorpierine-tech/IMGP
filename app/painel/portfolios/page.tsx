"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, FolderKanban, ChevronRight } from "lucide-react";

type Portfolio = { id: number; name: string; description?: string };
type PortfolioDetail = {
  portfolio: Portfolio;
  projects: Array<{ projectId: number; projectName: string; projectStatus: string; projectHealth: string; projectProgress: number; plannedCost: number; actualCost: number; strategicAlignment?: string }>;
  summary: { totalProjects: number; totalPlannedCost: number; totalActualCost: number; avgProgress: number };
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [detail, setDetail] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(appPath("/api/portfolios"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { portfolios?: Portfolio[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro");
        setPortfolios(body.portfolios ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadDetail(id: number) {
    const r = await fetch(appPath(`/api/portfolios?id=${id}`), { credentials: "include" });
    const body = await r.json() as PortfolioDetail;
    setDetail(body);
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  if (detail) {
    const { portfolio, projects, summary } = detail;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setDetail(null)} className="text-sm text-gray-500 hover:text-gray-700">Portfólios</button>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-900">{portfolio.name}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-bold">{summary.totalProjects}</div><div className="text-sm text-gray-500">Projetos</div></div>
          <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-bold">{summary.avgProgress}%</div><div className="text-sm text-gray-500">Progresso médio</div></div>
          <div className="bg-white rounded-xl border p-4"><div className="text-lg font-bold text-gray-900">{formatCurrency(summary.totalPlannedCost)}</div><div className="text-sm text-gray-500">Custo planejado</div></div>
          <div className="bg-white rounded-xl border p-4"><div className="text-lg font-bold text-gray-900">{formatCurrency(summary.totalActualCost)}</div><div className="text-sm text-gray-500">Custo realizado</div></div>
        </div>

        <div className="bg-white rounded-xl border">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500 text-left"><th className="p-3">Projeto</th><th className="p-3">Status</th><th className="p-3">Saúde</th><th className="p-3">Progresso</th><th className="p-3">Custo plan.</th><th className="p-3">Custo real</th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.projectId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{p.projectName}</td>
                  <td className="p-3 text-gray-600">{p.projectStatus}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.projectHealth === "on_track" ? "bg-emerald-100 text-emerald-700" : p.projectHealth === "attention" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {p.projectHealth === "on_track" ? "No prazo" : p.projectHealth === "attention" ? "Atenção" : "Atrasado"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2"><div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="bg-[#0c4a3e] h-1.5 rounded-full" style={{ width: `${p.projectProgress}%` }} /></div><span className="text-xs">{p.projectProgress}%</span></div>
                  </td>
                  <td className="p-3 text-gray-600">{formatCurrency(p.plannedCost)}</td>
                  <td className="p-3 text-gray-600">{formatCurrency(p.actualCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length === 0 && <div className="p-8 text-center text-sm text-gray-400">Nenhum projeto neste portfólio.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Portfólios</h1><p className="text-sm text-gray-500 mt-1">Agrupamentos estratégicos de projetos</p></div>

      {portfolios.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FolderKanban size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600">Nenhum portfólio criado</h3>
          <p className="text-sm text-gray-400 mt-1">Crie portfólios via API para organizar seus projetos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((p) => (
            <button key={p.id} onClick={() => loadDetail(p.id)} className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#0c4a3e]/10 text-[#0c4a3e] flex items-center justify-center"><FolderKanban size={20} /></div>
                <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
              </div>
              {p.description && <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
