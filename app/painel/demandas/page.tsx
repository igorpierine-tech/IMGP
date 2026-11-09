"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Plus } from "lucide-react";
import NovaDemandaForm from "../components/nova-demanda-form";
import Breadcrumbs from "../components/breadcrumbs";
import { SkeletonTable } from "../components/skeleton";
import EmptyState from "../components/empty-state";
import { useToast } from "../components/toast";

type Demand = {
  id: number;
  name: string;
  area: string;
  stage: string;
  impact: string;
  requesterName?: string;
  createdAt: string;
};

const stageBadge: Record<string, string> = {
  "Triagem": "bg-gray-100 text-gray-600",
  "Em Análise": "bg-blue-100 text-blue-700",
  "Aprovada": "bg-emerald-100 text-emerald-700",
  "Rejeitada": "bg-red-100 text-red-700",
  "Concluída": "bg-purple-100 text-purple-700",
};

const impactBadge: Record<string, string> = {
  "Baixo": "bg-gray-100 text-gray-600",
  "Médio": "bg-amber-100 text-amber-700",
  "Alto": "bg-red-100 text-red-700",
};

export default function DemandasPage() {
  const { toast } = useToast();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterStage, setFilterStage] = useState("");
  const [filterImpact, setFilterImpact] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "impact">("date");

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

  const impactOrder: Record<string, number> = { "Alto": 3, "Médio": 2, "Baixo": 1 };

  let filtered = demands;
  if (filterStage) filtered = filtered.filter((d) => d.stage === filterStage);
  if (filterImpact) filtered = filtered.filter((d) => d.impact === filterImpact);
  if (sortBy === "name") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === "impact") filtered = [...filtered].sort((a, b) => (impactOrder[b.impact] ?? 0) - (impactOrder[a.impact] ?? 0));
  else filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

      <NovaDemandaForm open={showNova} onClose={() => setShowNova(false)} onCreated={() => { setRefreshKey((k) => k + 1); toast("Demanda criada com sucesso"); }} />

      <div className="flex flex-wrap gap-3">
        <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0c4a3e]/20 outline-none">
          <option value="">Todos os estágios</option>
          <option>Triagem</option><option>Em Análise</option><option>Aprovada</option><option>Rejeitada</option><option>Concluída</option>
        </select>
        <select value={filterImpact} onChange={(e) => setFilterImpact(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0c4a3e]/20 outline-none">
          <option value="">Todos os impactos</option>
          <option>Baixo</option><option>Médio</option><option>Alto</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0c4a3e]/20 outline-none">
          <option value="date">Mais recentes</option><option value="name">Nome A-Z</option><option value="impact">Maior impacto</option>
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="generic" title="Nenhuma demanda cadastrada" description="Crie demandas para acompanhar solicitações." action={{ label: "Criar primeira demanda", onClick: () => setShowNova(true) }} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-white rounded-xl border overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 text-left">
                  <th className="p-3 font-medium">Título</th>
                  <th className="p-3 font-medium">Área</th>
                  <th className="p-3 font-medium">Estágio</th>
                  <th className="p-3 font-medium">Impacto</th>
                  <th className="p-3 font-medium">Solicitante</th>
                  <th className="p-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-900 max-w-[250px] truncate">{d.name}</td>
                    <td className="p-3 text-gray-600">{d.area}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageBadge[d.stage] ?? "bg-gray-100 text-gray-600"}`}>
                        {d.stage ?? "Triagem"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${impactBadge[d.impact] ?? "bg-gray-100 text-gray-600"}`}>
                        {d.impact}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{d.requesterName ?? "—"}</td>
                    <td className="p-3 text-gray-400 text-xs">{new Date(d.createdAt).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border p-4 space-y-2">
                <div className="font-medium text-gray-900 text-sm">{d.name}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageBadge[d.stage] ?? "bg-gray-100 text-gray-600"}`}>{d.stage ?? "Triagem"}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${impactBadge[d.impact] ?? "bg-gray-100 text-gray-600"}`}>{d.impact}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{d.area}</span>
                  <span>{new Date(d.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
