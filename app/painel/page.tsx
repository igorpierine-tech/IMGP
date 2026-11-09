"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import Link from "next/link";
import { BarChart3, FolderOpen, CheckCircle2, Clock, AlertTriangle, TrendingUp, Plus } from "lucide-react";
import NovoProjetoForm from "./components/novo-projeto-form";
import NovaDemandaForm from "./components/nova-demanda-form";
import { SkeletonDashboard } from "./components/skeleton";
import { useToast } from "./components/toast";

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

function DonutChart({ segments, size = 120 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  let cumAngle = -Math.PI / 2;
  const paths = segments.filter((s) => s.value > 0).map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return <path key={seg.label} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`} fill={seg.color} />;
  });
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{paths}<circle cx={cx} cy={cy} r={r * 0.55} fill="white" /></svg>
      <div className="space-y-1">
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600">{s.label}</span>
            <span className="font-medium text-gray-900">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChartSimple({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-24 truncate text-right">{d.label || "Sem área"}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
            <div className="bg-[#0c4a3e] h-4 rounded-full transition-all flex items-center justify-end pr-1.5"
              style={{ width: `${Math.max(8, (d.value / max) * 100)}%` }}>
              <span className="text-[10px] text-white font-medium">{d.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
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
    return <SkeletonDashboard />;
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
      <NovoProjetoForm open={showNovoProjeto} onClose={() => setShowNovoProjeto(false)} onCreated={() => { toast("Projeto criado com sucesso"); window.location.reload(); }} />
      <NovaDemandaForm open={showNovaDemanda} onClose={() => setShowNovaDemanda(false)} onCreated={() => { toast("Demanda criada com sucesso"); window.location.reload(); }} />

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
                <Link key={p.id} href={`/painel/projeto?id=${p.id}`} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded -mx-2 px-2 transition-colors">
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
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Saúde dos projetos</h2>
          <DonutChart size={100} segments={[
            { value: d.projects.onTrack ?? 0, color: "#10b981", label: "No prazo" },
            { value: d.projects.attention ?? 0, color: "#f59e0b", label: "Atenção" },
            { value: d.projects.late ?? 0, color: "#ef4444", label: "Atrasado" },
          ]} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Status dos projetos</h3>
          <DonutChart segments={[
            { value: d.projects.planning, color: "#94a3b8", label: "Planejamento" },
            { value: d.projects.inProgress, color: "#3b82f6", label: "Em andamento" },
            { value: d.projects.completed, color: "#10b981", label: "Concluídos" },
          ]} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Tarefas</h3>
          <DonutChart segments={[
            { value: d.tasks.planned, color: "#94a3b8", label: "Planejadas" },
            { value: d.tasks.inProgress, color: "#3b82f6", label: "Em progresso" },
            { value: d.tasks.blocked, color: "#ef4444", label: "Bloqueadas" },
            { value: d.tasks.done, color: "#10b981", label: "Concluídas" },
          ]} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Demandas</h3>
          <DonutChart segments={[
            { value: d.demands.triagem, color: "#94a3b8", label: "Triagem" },
            { value: d.demands.emAnalise, color: "#3b82f6", label: "Em análise" },
            { value: d.demands.aprovada, color: "#10b981", label: "Aprovadas" },
            { value: d.demands.rejeitada, color: "#ef4444", label: "Rejeitadas" },
          ]} />
        </div>
      </div>

      {d.projectsByArea.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Projetos por área</h3>
          <BarChartSimple data={d.projectsByArea.slice(0, 8).map((a) => ({ label: a.area, value: a.count }))} />
        </div>
      )}
    </div>
  );
}
