"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, FolderKanban, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import NovoPortfolioForm from "../components/novo-portfolio-form";
import { useToast } from "../components/toast";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

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
  const { toast } = useToast();
  const [showNovo, setShowNovo] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(appPath("/api/portfolios"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { portfolios?: Portfolio[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro");
        setPortfolios(body.portfolios ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function loadDetail(id: number) {
    const r = await fetch(appPath(`/api/portfolios?id=${id}`), { credentials: "include" });
    const body = await r.json() as PortfolioDetail;
    setDetail(body);
  }

  function openEdit(p: Portfolio) { setEditingPortfolio(p); setShowNovo(true); }

  async function handleDelete(p: Portfolio) {
    if (!confirm(`Excluir portfólio "${p.name}" e todas as suas associações?`)) return;
    try {
      const r = await fetch(appPath("/api/portfolios"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }),
      });
      if (!r.ok) { const b = await r.json() as { error?: string }; throw new Error(b.error ?? "Erro"); }
      toast("Portfólio excluído");
      setRefreshKey((k) => k + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro"); }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  if (detail) {
    const { portfolio, projects, summary } = detail;
    type PortProject = typeof projects[number];
    const pfColumns: ColumnDef<PortProject>[] = [
      { key: "projectName", label: "Projeto", sortable: true, getValue: (p) => p.projectName },
      { key: "projectStatus", label: "Status", sortable: true, filterable: true, filterOptions: [...new Set(projects.map(p => p.projectStatus))].sort(), getValue: (p) => p.projectStatus },
      { key: "projectHealth", label: "Saúde", sortable: true, getValue: (p) => p.projectHealth },
      { key: "projectProgress", label: "Progresso", sortable: true, getValue: (p) => p.projectProgress },
      { key: "plannedCost", label: "Custo plan.", sortable: true, getValue: (p) => p.plannedCost },
      { key: "actualCost", label: "Custo real", sortable: true, getValue: (p) => p.actualCost },
    ];
    const pf = useSortableTable<PortProject>(projects);
    const sortedProjects = pf.sortAndFilter(projects, pfColumns);
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
            <thead><tr className="border-b text-left">
              {pfColumns.map((col) => (
                <SortableHeader key={col.key} label={col.label} sortDir={pf.getSortDir(col.key)} onSort={() => pf.toggleSort(col.key)}
                  sortable={col.sortable} filterable={col.filterable} filterOptions={col.filterOptions}
                  filterValue={pf.filters[col.key] ?? ""} onFilter={(v) => pf.setFilter(col.key, v)} />
              ))}
            </tr></thead>
            <tbody>
              {sortedProjects.map((p) => (
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
      <Breadcrumbs items={[{ label: "Portfólios" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Portfólios</h1><p className="text-sm text-gray-500 mt-1">Agrupamentos estratégicos de projetos</p></div>
        <button onClick={() => setShowNovo(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Novo Portfólio
        </button>
      </div>
      <NovoPortfolioForm open={showNovo} onClose={() => { setShowNovo(false); setEditingPortfolio(null); }} editing={editingPortfolio} onCreated={() => { setRefreshKey((k) => k + 1); toast(editingPortfolio ? "Portfólio atualizado" : "Portfólio criado"); setEditingPortfolio(null); }} />

      {portfolios.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FolderKanban size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600">Nenhum portfólio criado</h3>
          <p className="text-sm text-gray-400 mt-1">Crie portfólios para organizar seus projetos.</p>
          <button onClick={() => setShowNovo(true)} className="mt-3 px-4 py-2 text-sm font-medium text-white bg-[#0c4a3e] rounded-lg hover:bg-[#0a3d33]">Criar primeiro portfólio</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => loadDetail(p.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-10 h-10 rounded-lg bg-[#0c4a3e]/10 text-[#0c4a3e] flex items-center justify-center shrink-0"><FolderKanban size={20} /></div>
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{p.name}</h3>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-[#0c4a3e] p-1"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(p)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
              {p.description && <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
