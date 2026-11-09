"use client";

import { useEffect, useState, useRef } from "react";
import { appPath } from "@/lib/app-path";
import Link from "next/link";
import { FolderOpen, CheckCircle2, Clock, AlertTriangle, Plus, ArrowUpRight } from "lucide-react";
import NovoProjetoForm from "./components/novo-projeto-form";
import NovaDemandaForm from "./components/nova-demanda-form";
import { SkeletonDashboard } from "./components/skeleton";
import { useToast } from "./components/toast";
import { HealthPieChart, TasksPieChart, AreaBarChart, ProgressAreaChart } from "./components/dashboard-charts";

type DashboardData = {
  projects: { total: number; planning: number; inProgress: number; completed: number; onTrack: number; attention: number; late: number };
  tasks: { total: number; done: number; inProgress: number; blocked: number; planned: number; overdue: number };
  demands: { total: number; triagem: number; emAnalise: number; aprovada: number; rejeitada: number };
  timeTracking: { totalHoursLast30Days: number; entriesLast30Days: number };
  projectsByArea: Array<{ area: string; count: number }>;
  recentProjects: Array<{ id: number; name: string; status: string; health: string; progress: number }>;
};

function AnimatedCounter({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (ref.current !== null) cancelAnimationFrame(ref.current);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) { setDisplay(value); return; }
    const start = performance.now();
    const from = display;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current !== null) cancelAnimationFrame(ref.current); };
  }, [value, duration]);
  return <>{display}</>;
}

function AvatarInitials({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
  ];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const s = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${s} rounded-full ${colors[idx]} text-white flex items-center justify-center font-semibold shrink-0 ring-2 ring-white`}>
      {initials}
    </div>
  );
}

function Sparkline({ values, color = "#10b981", width = 60, height = 24 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GradientProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className="progress-gradient h-2 rounded-full" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, gradient, sparkValues }: {
  icon: any; label: string; value: number; sub?: string; color: string; gradient: string; sparkValues?: number[];
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-gray-200/60 p-5 flex items-start gap-4 card-hover ${gradient}`}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.07] -mr-6 -mt-6">
        <Icon size={96} />
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color} shadow-sm`}>
        <Icon size={20} />
      </div>
      <div className="relative flex-1 min-w-0">
        <div className="flex items-end gap-2">
          <div className="text-3xl font-extrabold text-gray-900"><AnimatedCounter value={value} /></div>
          {sparkValues && <Sparkline values={sparkValues} />}
        </div>
        <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function HealthBadge({ health }: { health: string }) {
  const styles: Record<string, string> = {
    on_track: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    attention: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    late: "bg-red-100 text-red-700 ring-1 ring-red-200",
  };
  const labels: Record<string, string> = { on_track: "No prazo", attention: "Atenção", late: "Atrasado" };
  const dots: Record<string, string> = { on_track: "bg-emerald-500", attention: "bg-amber-500", late: "bg-red-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[health] ?? "bg-gray-100 text-gray-600"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[health] ?? "bg-gray-400"}`} />
      {labels[health] ?? health}
    </span>
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
  const taskDoneRatio = d.tasks.total > 0 ? Math.round((d.tasks.done / d.tasks.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-[#0c4a3e] to-[#0e6b56] rounded-xl p-5 -mx-1 shadow-md animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-emerald-200/70 mt-1">Visão geral de todos os projetos e indicadores</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNovoProjeto(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0c4a3e] bg-white hover:bg-emerald-50 rounded-lg transition-colors shadow-sm">
            <Plus size={16} /> Novo Projeto
          </button>
          <button onClick={() => setShowNovaDemanda(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-white/15 border border-white/20 hover:bg-white/25 rounded-lg transition-colors backdrop-blur-sm">
            <Plus size={16} /> Nova Demanda
          </button>
        </div>
      </div>
      <NovoProjetoForm open={showNovoProjeto} onClose={() => setShowNovoProjeto(false)} onCreated={() => { toast("Projeto criado com sucesso"); window.location.reload(); }} />
      <NovaDemandaForm open={showNovaDemanda} onClose={() => setShowNovaDemanda(false)} onCreated={() => { toast("Demanda criada com sucesso"); window.location.reload(); }} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-scale-in stagger-1">
          <StatCard icon={FolderOpen} label="Projetos ativos" value={d.projects.inProgress}
            sub={`${d.projects.total} no total`}
            color="bg-blue-500 text-white" gradient="bg-gradient-to-br from-blue-50 via-white to-blue-50/30"
            sparkValues={[d.projects.planning, d.projects.inProgress, d.projects.completed]} />
        </div>
        <div className="animate-scale-in stagger-2">
          <StatCard icon={CheckCircle2} label="Tarefas concluídas" value={d.tasks.done}
            sub={`${taskDoneRatio}% do total`}
            color="bg-emerald-500 text-white" gradient="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30"
            sparkValues={[d.tasks.planned, d.tasks.inProgress, d.tasks.done]} />
        </div>
        <div className="animate-scale-in stagger-3">
          <StatCard icon={Clock} label="Horas registradas" value={hoursLogged}
            sub={`${d.timeTracking?.entriesLast30Days ?? 0} lançamentos`}
            color="bg-purple-500 text-white" gradient="bg-gradient-to-br from-purple-50 via-white to-purple-50/30" />
        </div>
        <div className="animate-scale-in stagger-4">
          <StatCard icon={AlertTriangle} label="Projetos em atenção" value={(d.projects.attention ?? 0) + (d.projects.late ?? 0)}
            sub={`${d.projects.onTrack ?? 0} no prazo`}
            color="bg-amber-500 text-white" gradient="bg-gradient-to-br from-amber-50 via-white to-amber-50/30"
            sparkValues={[d.projects.onTrack, d.projects.attention, d.projects.late]} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm card-hover animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#0c4a3e] rounded-full" />
              Projetos recentes
            </h2>
            <Link href="/painel/kanban" className="text-xs text-[#0c4a3e] hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight size={12} />
            </Link>
          </div>
          {d.recentProjects.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum projeto encontrado.</p>
          ) : (
            <div className="space-y-1">
              {d.recentProjects.map((p) => (
                <Link key={p.id} href={`/painel/projeto?id=${p.id}`}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 rounded-lg -mx-2 px-3 transition-all group">
                  <AvatarInitials name={p.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate group-hover:text-[#0c4a3e] transition-colors">{p.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <HealthBadge health={p.health} />
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    <div className="text-xs text-right text-gray-500 mb-1 font-medium">{p.progress}%</div>
                    <GradientProgressBar value={p.progress} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm card-hover animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500 rounded-full" />
            Saúde dos projetos
          </h2>
          <HealthPieChart data={{ onTrack: d.projects.onTrack ?? 0, attention: d.projects.attention ?? 0, late: d.projects.late ?? 0 }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm card-hover animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full" />
            Tarefas
          </h3>
          <TasksPieChart data={{ planned: d.tasks.planned, inProgress: d.tasks.inProgress, blocked: d.tasks.blocked, done: d.tasks.done }} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm card-hover animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full" />
            Progresso dos projetos
          </h3>
          <ProgressAreaChart projects={d.recentProjects} />
        </div>
      </div>

      {d.projectsByArea.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm card-hover animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-500 rounded-full" />
            Projetos por área
          </h3>
          <AreaBarChart data={d.projectsByArea} />
        </div>
      )}
    </div>
  );
}
