"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Plus, Pencil, Trash2 } from "lucide-react";
import NovaDemandaForm from "../components/nova-demanda-form";
import Breadcrumbs from "../components/breadcrumbs";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";
import { SkeletonTable } from "../components/skeleton";
import EmptyState from "../components/empty-state";
import { useToast } from "../components/toast";
import Pagination from "../components/pagination";

type Demand = {
  id: number;
  name: string;
  area: string;
  stage: string;
  impact: string;
  objective: string;
  projectTypeId: number;
  solution?: string | null;
  benefit?: string | null;
  risk?: string | null;
  estimatedCost?: number | null;
  estimatedHours?: number | null;
  requesterName?: string;
  createdAt: string;
};

const stageBadge: Record<string, string> = {
  "Triagem": "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  "Em Análise": "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  "Aprovada": "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  "Rejeitada": "bg-red-100 text-red-700 ring-1 ring-red-200",
  "Concluída": "bg-purple-100 text-purple-700 ring-1 ring-purple-200",
};

const stageDot: Record<string, string> = {
  "Triagem": "bg-gray-400",
  "Em Análise": "bg-blue-500",
  "Aprovada": "bg-emerald-500",
  "Rejeitada": "bg-red-500",
  "Concluída": "bg-purple-500",
};

const impactBadge: Record<string, string> = {
  "Baixo": "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  "Médio": "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  "Alto": "bg-red-100 text-red-700 ring-1 ring-red-200",
};

function DemandAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <div className={`w-6 h-6 rounded-full ${colors[idx]} text-white flex items-center justify-center text-[10px] font-semibold shrink-0`} title={name}>
      {initials}
    </div>
  );
}

export default function DemandasPage() {
  const { toast } = useToast();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const demandColumns: ColumnDef<Demand>[] = [
    { key: "name", label: "Título", sortable: true, getValue: (d) => d.name },
    { key: "area", label: "Área", sortable: true, filterable: true, filterOptions: [...new Set(demands.map(d => d.area))].sort(), getValue: (d) => d.area },
    { key: "stage", label: "Estágio", sortable: true, filterable: true, filterOptions: ["Triagem", "Em Análise", "Aprovada", "Rejeitada", "Concluída"], getValue: (d) => d.stage },
    { key: "impact", label: "Impacto", sortable: true, filterable: true, filterOptions: ["Baixo", "Médio", "Alto"], getValue: (d) => d.impact },
    { key: "requesterName", label: "Solicitante", sortable: true, getValue: (d) => d.requesterName ?? "" },
    { key: "createdAt", label: "Data", sortable: true, getValue: (d) => new Date(d.createdAt).getTime() },
  ];
  const { toggleSort, setFilter, getSortDir, filters, sortAndFilter } = useSortableTable<Demand>(demands, "createdAt", "desc");

  useEffect(() => {
    setLoading(true);
    fetch(appPath("/api/demands"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { demands?: Demand[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro");
        setDemands(body.demands ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  function openEdit(d: Demand) { setEditingDemand(d); setShowNova(true); }

  async function handleDelete(d: Demand) {
    if (!confirm(`Excluir demanda "${d.name}"?`)) return;
    try {
      const r = await fetch(appPath("/api/demands"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id }),
      });
      if (!r.ok) { const b = await r.json() as { error?: string }; throw new Error(b.error ?? "Erro"); }
      toast("Demanda excluída");
      setRefreshKey((k) => k + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro"); }
  }

  const filtered = sortAndFilter(demands, demandColumns);

  const totalFiltered = filtered.length;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Demandas" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandas</h1>
          <p className="text-sm text-gray-500 mt-1">Solicitações de novas funcionalidades e melhorias</p>
        </div>
        <button onClick={() => setShowNova(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Nova Demanda
        </button>
      </div>

      <NovaDemandaForm open={showNova} onClose={() => { setShowNova(false); setEditingDemand(null); }} editing={editingDemand} onCreated={() => { setRefreshKey((k) => k + 1); toast(editingDemand ? "Demanda atualizada" : "Demanda criada com sucesso"); setEditingDemand(null); }} />

      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : totalFiltered === 0 ? (
        <EmptyState icon="generic" title="Nenhuma demanda cadastrada" description="Crie demandas para acompanhar solicitações." action={{ label: "Criar primeira demanda", onClick: () => setShowNova(true) }} />
      ) : (
        <>
          <div className="bg-white rounded-xl border overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  {demandColumns.map((col) => (
                    <SortableHeader key={col.key} label={col.label} sortDir={getSortDir(col.key)} onSort={() => toggleSort(col.key)}
                      sortable={col.sortable} filterable={col.filterable} filterOptions={col.filterOptions}
                      filterValue={filters[col.key] ?? ""} onFilter={(v) => setFilter(col.key, v)} />
                  ))}
                  <th className="p-3 font-medium text-gray-500 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50/80 transition-all group">
                    <td className="p-3 font-medium text-gray-900 max-w-[250px] truncate group-hover:text-[#0c4a3e] transition-colors">{d.name}</td>
                    <td className="p-3 text-gray-600">{d.area}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${stageBadge[d.stage] ?? "bg-gray-100 text-gray-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stageDot[d.stage] ?? "bg-gray-400"}`} />
                        {d.stage ?? "Triagem"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${impactBadge[d.impact] ?? "bg-gray-100 text-gray-600"}`}>
                        {d.impact}
                      </span>
                    </td>
                    <td className="p-3">
                      {d.requesterName ? (
                        <div className="flex items-center gap-2">
                          <DemandAvatar name={d.requesterName} />
                          <span className="text-gray-600">{d.requesterName}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-3 text-gray-400 text-xs">{new Date(d.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(d)} className="text-gray-400 hover:text-[#0c4a3e]"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(d)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 pb-3">
              <Pagination currentPage={currentPage} totalItems={totalFiltered} pageSize={pageSize} onPageChange={(p) => setCurrentPage(p)} />
            </div>
          </div>
          <div className="space-y-3 md:hidden">
            {paginated.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border p-4 space-y-2">
                <div className="font-medium text-gray-900 text-sm">{d.name}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageBadge[d.stage] ?? "bg-gray-100 text-gray-600"}`}>{d.stage ?? "Triagem"}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${impactBadge[d.impact] ?? "bg-gray-100 text-gray-600"}`}>{d.impact}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{d.area} · {new Date(d.createdAt).toLocaleDateString("pt-BR")}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(d)} className="text-gray-400 hover:text-[#0c4a3e] p-1"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(d)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            <Pagination currentPage={currentPage} totalItems={totalFiltered} pageSize={pageSize} onPageChange={(p) => setCurrentPage(p)} />
          </div>
        </>
      )}
    </div>
  );
}
