"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Target, Plus, ChevronDown, ChevronRight } from "lucide-react";
import NovoObjetivoForm, { NovoKeyResultForm } from "../components/novo-objetivo-form";
import Breadcrumbs from "../components/breadcrumbs";
import { SkeletonTable } from "../components/skeleton";
import EmptyState from "../components/empty-state";
import { useToast } from "../components/toast";

type KeyResult = { id: number; title: string; metricType: string; targetValue: number; currentValue: number; unit?: string };
type Objective = { id: number; title: string; description?: string; status: string; progress: number; period?: string; createdAt: string };

export default function OkrsPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [expanded, setExpanded] = useState<Record<number, { krs: KeyResult[]; loaded: boolean }>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNovoObj, setShowNovoObj] = useState(false);
  const [krTarget, setKrTarget] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(appPath("/api/okrs"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { objectives?: Objective[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro");
        setObjectives(body.objectives ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function toggleExpand(id: number) {
    if (expanded[id]) {
      const next = { ...expanded };
      delete next[id];
      setExpanded(next);
      return;
    }
    setExpanded((prev) => ({ ...prev, [id]: { krs: [], loaded: false } }));
    const r = await fetch(appPath(`/api/okrs?id=${id}`), { credentials: "include" });
    const body = await r.json() as { keyResults?: KeyResult[] };
    setExpanded((prev) => ({ ...prev, [id]: { krs: body.keyResults ?? [], loaded: true } }));
  }

  const { toast } = useToast();

  if (loading) return <SkeletonTable rows={4} cols={3} />;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  const statusColors: Record<string, string> = {
    active: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "OKRs / Metas" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OKRs / Metas</h1>
          <p className="text-sm text-gray-500 mt-1">Objetivos e resultados-chave da organização</p>
        </div>
        <button onClick={() => setShowNovoObj(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Novo Objetivo
        </button>
      </div>
      <NovoObjetivoForm open={showNovoObj} onClose={() => setShowNovoObj(false)} onCreated={() => { setRefreshKey((k) => k + 1); toast("Objetivo criado com sucesso"); }} />
      {krTarget !== null && (
        <NovoKeyResultForm open objectiveId={krTarget} onClose={() => setKrTarget(null)} onCreated={() => { setRefreshKey((k) => k + 1); setExpanded({}); }} />
      )}

      {objectives.length === 0 ? (
        <EmptyState icon="generic" title="Nenhum objetivo definido" description="Crie objetivos para começar a acompanhar." action={{ label: "Criar primeiro objetivo", onClick: () => setShowNovoObj(true) }} />
      ) : (
        <div className="space-y-3">
          {objectives.map((obj) => (
            <div key={obj.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => toggleExpand(obj.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
                {expanded[obj.id] ? <ChevronDown size={18} className="text-gray-400 shrink-0" /> : <ChevronRight size={18} className="text-gray-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{obj.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[obj.status] ?? "bg-gray-100 text-gray-600"}`}>{obj.status}</span>
                  </div>
                  {obj.period && <span className="text-xs text-gray-400">{obj.period}</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-gray-900">{obj.progress}%</span>
                  <div className="w-24 bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${obj.progress >= 70 ? "bg-emerald-500" : obj.progress >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, obj.progress)}%` }} />
                  </div>
                </div>
              </button>

              {expanded[obj.id] && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                  {!expanded[obj.id].loaded ? (
                    <div className="text-sm text-gray-400 py-2"><Loader2 className="animate-spin inline mr-1" size={14} /> Carregando...</div>
                  ) : expanded[obj.id].krs.length === 0 ? (
                    <div className="text-sm text-gray-400 py-2">Nenhum Key Result definido.
                      <button onClick={() => setKrTarget(obj.id)} className="ml-2 text-[#0c4a3e] hover:underline">Adicionar</button>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-1">
                      {expanded[obj.id].krs.map((kr) => {
                        const pct = kr.targetValue > 0 ? Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100)) : 0;
                        return (
                          <div key={kr.id} className="flex items-center gap-3 py-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-700 truncate">{kr.title}</div>
                              <div className="text-xs text-gray-400">{kr.currentValue} / {kr.targetValue} {kr.unit ?? ""}</div>
                            </div>
                            <div className="w-20 bg-gray-100 rounded-full h-1.5 shrink-0">
                              <div className="bg-[#0c4a3e] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={() => setKrTarget(obj.id)}
                    className="mt-2 flex items-center gap-1 text-xs text-[#0c4a3e] hover:underline">
                    <Plus size={12} /> Adicionar Key Result
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
