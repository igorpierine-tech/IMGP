"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { BarChart3, FolderOpen, CheckCircle2, Clock, AlertTriangle, TrendingUp, Loader2, Plus } from "lucide-react";
import NovoProjetoForm from "./components/novo-projeto-form";
import NovaDemandaForm from "./components/nova-demanda-form";

type DashboardData = {
  projects: { total: number; planning: number; inProgress: number; completed: number; onTrack: number; attention: number; late: number };
  tasks: { total: number; done: number; inProgress: number; blocked: number; planned: number; overdue: number };
  demands: { total: number; triagem: number; emAnalise: number; aprovada: number; rejeitada: number };
  timeTracking: { totalHoursLast30Days: number; entriesLast30Days: number };
  projectsByArea: Array<{ area: string; count: number }>;
  recentProjects: Array<{ id: number; name: string; status: string; health: string; progress: number }>;
};

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function HealthBadge({ health }: { health: string }) {
  const styles: Record<string, string> = {
    on_track: "bg-emerald-100 text-emerald-700",
    attention: "bg-amber-100 text-amber-700",
    late: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = { on_track: "No prazo", attention: "Atenção", late: "Atrasado" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[health] ?? "bg-gray-100 text-gray-600"}`}>{labels[health] ?? health}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className="bg-[#0c4a3e] h-2 rounded-full transition-all" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [showNovoProjeto, setShowNovoProjeto] = useState(false);
  const [showNovaDemanda, setShowNovaDemanda] = useState(false);

  useEffect(() => {
    fetch(appPath("/api/dashboard"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { dashboard?: DashboardData; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro ao carregar dashboard");
        setData(body.dashboard ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (!data && !error) {
    return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando dashboard...</div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;
  }

  const d = data!;
  const hoursLogged = d.timeTracking?.totalHoursLast30Days ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral de todos os projetos e indicadores</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNovoProjeto(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
            <Plus size={16} /> Novo Projeto
          </button>
          <button onClick={() => setShowNovaDemanda(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0c4a3e] bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
            <Plus size={16} /> Nova Demanda
          </button>
        </div>
      </div>
      <NovoProjetoForm open={showNovoProjeto} onClose={() => setShowNovoProjeto(false)} onCreated={() => window.location.reload()} />
      <NovaDemandaForm open={showNovaDemanda} onClose={() => setShowNovaDemanda(false)} onCreated={() => window.location.reload()} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderOpen} label="Projetos ativos" value={d.projects.inProgress} sub={`${d.projects.total} no total`} color="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckCircle2} label="Tarefas concluídas" value={d.tasks.done} sub={`de ${d.tasks.total}`} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Clock} label="Horas registradas" value={hoursLogged} sub={`${d.timeTracking?.entriesLast30Days ?? 0} lançamentos`} color="bg-purple-50 text-purple-600" />
        <StatCard icon={AlertTriangle} label="Projetos em atenção" value={(d.projects.attention ?? 0) + (d.projects.late ?? 0)} sub={`${d.projects.onTrack ?? 0} no prazo`} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Projetos recentes</h2>
          {d.recentProjects.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum projeto encontrado.</p>
          ) : (
            <div className="space-y-3">
              {d.recentProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <HealthBadge health={p.health} />
                      <span className="text-xs text-gray-400">{p.status}</span>
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="text-xs text-right text-gray-500 mb-1">{p.progress}%</div>
                    <ProgressBar value={p.progress} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Projetos por área</h2>
          {d.projectsByArea.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma área encontrada.</p>
          ) : (
            <div className="space-y-3">
              {d.projectsByArea.map((a) => (
                <div key={a.area} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate">{a.area || "Sem área"}</span>
                  <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Status dos projetos</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Planejamento</span><span className="font-medium">{d.projects.planning}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Em andamento</span><span className="font-medium">{d.projects.inProgress}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Concluídos</span><span className="font-medium">{d.projects.completed}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Tarefas</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Em progresso</span><span className="font-medium">{d.tasks.inProgress}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Bloqueadas</span><span className="font-medium text-red-600">{d.tasks.blocked}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Concluídas</span><span className="font-medium text-emerald-600">{d.tasks.done}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Demandas</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Total</span><span className="font-medium">{d.demands.total}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Triagem</span><span className="font-medium">{d.demands.triagem}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Aprovadas</span><span className="font-medium">{d.demands.aprovada}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
