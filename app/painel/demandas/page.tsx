"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, FileText, Plus } from "lucide-react";
import NovaDemandaForm from "../components/nova-demanda-form";

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
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-6">
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

      <NovaDemandaForm open={showNova} onClose={() => setShowNova(false)} onCreated={() => setRefreshKey((k) => k + 1)} />

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>
      ) : demands.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FileText size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600">Nenhuma demanda cadastrada</h3>
          <p className="text-sm text-gray-400 mt-1">Crie demandas para acompanhar solicitações.</p>
          <button onClick={() => setShowNova(true)} className="mt-3 px-4 py-2 text-sm font-medium text-white bg-[#0c4a3e] rounded-lg hover:bg-[#0a3d33]">Criar primeira demanda</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
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
              {demands.map((d) => (
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
      )}
    </div>
  );
}
