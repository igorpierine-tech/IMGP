"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { appPath } from "@/lib/app-path";
import {
  Loader2, ChevronRight, FolderOpen, CheckCircle2, Clock, AlertTriangle,
  Calendar, Users, Edit2, MessageSquare, Plus,
} from "lucide-react";
import NovaTarefaForm from "../components/nova-tarefa-form";
import NovoSprintForm from "../components/novo-sprint-form";
import CommentsSection from "../components/comments-section";
import EditProjectForm from "../components/edit-project-form";
import EditTarefaForm from "../components/edit-tarefa-form";

type Project = {
  id: number; name: string; code?: string; area?: string; managerName?: string;
  status: string; health: string; progress: number; plannedHours: number;
  plannedCost: number; actualCost: number; plannedStart?: string; plannedEnd?: string;
  projectTypeId?: number; projectPrioritized?: boolean;
};

type TaskItem = {
  id: number; name: string; kind: string; status: string; health: string;
  assignedName?: string; plannedStart?: string; plannedEnd?: string; plannedHours: number;
  rawJson?: string;
};

type Sprint = {
  id: number; name: string; status: string; objective?: string;
  startDate?: string; endDate?: string; phaseId: number;
};

type Phase = { id: number; name: string; position: number };

const statusLabels: Record<string, string> = {
  planning: "Planejamento", active: "Ativo", on_hold: "Pausado",
  completed: "Concluído", cancelled: "Cancelado",
};
const healthStyles: Record<string, { bg: string; label: string }> = {
  on_track: { bg: "bg-emerald-100 text-emerald-700", label: "No prazo" },
  attention: { bg: "bg-amber-100 text-amber-700", label: "Atenção" },
  late: { bg: "bg-red-100 text-red-700", label: "Atrasado" },
};
const taskStatusStyles: Record<string, string> = {
  "A fazer": "bg-gray-100 text-gray-600", "Em progresso": "bg-blue-100 text-blue-700",
  "Bloqueada": "bg-red-100 text-red-700", "Em revisão": "bg-purple-100 text-purple-700",
  "Concluída": "bg-emerald-100 text-emerald-700",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function ProjetoDetailPage() {
  const searchParams = useSearchParams();
  const projectId = Number(searchParams.get("id"));

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"tarefas" | "sprints" | "comentarios">("tarefas");
  const [showNovaTarefa, setShowNovaTarefa] = useState(false);
  const [showNovoSprint, setShowNovoSprint] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!projectId) { setError("Projeto não informado."); setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetch(appPath("/api/projects"), { credentials: "include" }).then((r) => r.json() as Promise<{ projects: Project[] }>),
      fetch(appPath(`/api/kanban?projectId=${projectId}`), { credentials: "include" }).then((r) => r.json() as Promise<{ columns: Record<string, TaskItem[]>; total: number }>),
      fetch(appPath(`/api/phases?projectRef=platform:${projectId}`), { credentials: "include" }).then((r) => r.json() as Promise<{ phases: Phase[] }>),
    ]).then(([projRes, kanbanRes, phasesRes]) => {
      const found = projRes.projects?.find((p) => p.id === projectId);
      if (!found) { setError("Projeto não encontrado."); return; }
      setProject(found);
      const allTasks: TaskItem[] = [];
      if (kanbanRes.columns) Object.values(kanbanRes.columns).forEach((col) => allTasks.push(...col));
      setTasks(allTasks);
      setPhases(phasesRes.phases ?? []);
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [projectId, refreshKey]);

  useEffect(() => {
    if (!projectId) return;
    fetch(appPath(`/api/phases?projectRef=platform:${projectId}`), { credentials: "include" })
      .then((r) => r.json() as Promise<{ phases: Phase[] }>)
      .then((res) => {
        const phaseIds = (res.phases ?? []).map((p) => p.id);
        if (phaseIds.length === 0) return;
        setSprints([]);
      });
  }, [projectId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando projeto...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;
  if (!project) return null;

  const hs = healthStyles[project.health] ?? { bg: "bg-gray-100 text-gray-600", label: project.health };
  const doneTasks = tasks.filter((t) => t.status === "Concluída").length;
  const totalHours = tasks.reduce((s, t) => s + (t.plannedHours ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/painel" className="text-gray-500 hover:text-gray-700">Dashboard</Link>
        <ChevronRight size={14} className="text-gray-400" />
        <span className="font-medium text-gray-900">{project.name}</span>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${hs.bg}`}>{hs.label}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{statusLabels[project.status] ?? project.status}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {project.code && <span>Código: {project.code}</span>}
              {project.area && <span>Área: {project.area}</span>}
              {project.managerName && <span><Users size={14} className="inline mr-1" />Gerente: {project.managerName}</span>}
            </div>
          </div>
          <button onClick={() => setShowEditProject(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
            <Edit2 size={14} /> Editar
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Progresso</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
              <div className="bg-[#0c4a3e] h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, project.progress)}%` }} />
            </div>
            <span className="text-sm font-bold text-gray-900">{project.progress}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
            <div className="text-xs text-gray-500">Tarefas ({doneTasks} concluídas)</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{totalHours}h</div>
            <div className="text-xs text-gray-500">de {project.plannedHours}h planejadas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">{formatCurrency(project.actualCost)}</div>
            <div className="text-xs text-gray-500">de {formatCurrency(project.plannedCost)} planejado</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <Calendar size={14} />
              {formatDate(project.plannedStart)} — {formatDate(project.plannedEnd)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Período planejado</div>
          </div>
        </div>
      </div>

      {phases.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Fases do projeto</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {phases.map((ph) => (
              <div key={ph.id} className="shrink-0 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-700 border">
                {ph.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {(["tarefas", "sprints", "comentarios"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-[#0c4a3e] text-[#0c4a3e]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t === "tarefas" ? `Tarefas (${tasks.length})` : t === "sprints" ? "Sprints" : "Comentários"}
            </button>
          ))}
        </div>
      </div>

      {tab === "tarefas" && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowNovaTarefa(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg">
              <Plus size={14} /> Nova Tarefa
            </button>
          </div>
          {tasks.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">Nenhuma tarefa neste projeto.</div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-gray-500 text-left">
                  <th className="p-3 font-medium">Tarefa</th><th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Responsável</th>
                  <th className="p-3 font-medium">Horas</th><th className="p-3 font-medium">Prazo</th>
                  <th className="p-3 font-medium w-10"></th>
                </tr></thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900 max-w-[200px] truncate">{t.name}</td>
                      <td className="p-3 text-gray-500 capitalize">{t.kind}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${taskStatusStyles[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status}</span></td>
                      <td className="p-3 text-gray-600">{t.assignedName ?? "—"}</td>
                      <td className="p-3 text-gray-600">{t.plannedHours ?? 0}h</td>
                      <td className="p-3 text-gray-400 text-xs">{formatDate(t.plannedEnd)}</td>
                      <td className="p-3">
                        <button onClick={() => setEditingTask(t)} className="text-gray-400 hover:text-gray-600"><Edit2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "comentarios" && (
        <CommentsSection entityType="project" entityId={projectId} />
      )}

      {tab === "sprints" && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowNovoSprint(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg">
              <Plus size={14} /> Novo Sprint
            </button>
          </div>
          <div className="text-sm text-gray-400">Sprints do projeto aparecem aqui após a criação.</div>
        </div>
      )}

      <NovaTarefaForm open={showNovaTarefa} onClose={() => setShowNovaTarefa(false)}
        onCreated={() => { setRefreshKey((k) => k + 1); setShowNovaTarefa(false); }} defaultProjectId={projectId} />
      <NovoSprintForm open={showNovoSprint} onClose={() => setShowNovoSprint(false)}
        onCreated={() => { setRefreshKey((k) => k + 1); setShowNovoSprint(false); }} />
      {showEditProject && (
        <EditProjectForm project={project} onClose={() => setShowEditProject(false)}
          onSaved={() => { setRefreshKey((k) => k + 1); setShowEditProject(false); }} />
      )}
      {editingTask && (
        <EditTarefaForm task={editingTask} onClose={() => setEditingTask(null)}
          onSaved={() => { setRefreshKey((k) => k + 1); setEditingTask(null); }} />
      )}
    </div>
  );
}
