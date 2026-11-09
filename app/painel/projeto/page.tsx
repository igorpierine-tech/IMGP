"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { appPath } from "@/lib/app-path";
import {
  Loader2, ChevronRight, FolderOpen, CheckCircle2, Clock, AlertTriangle,
  Calendar, Users, Edit2, Trash2, MessageSquare, Plus, ChevronDown, Layers,
} from "lucide-react";
import { SortableHeader, useSortableTable, type SortDir, type ColumnDef } from "../components/sortable-header";
import NovaTarefaForm from "../components/nova-tarefa-form";
import NovoSprintForm from "../components/novo-sprint-form";
import CommentsSection from "../components/comments-section";
import EditProjectForm from "../components/edit-project-form";
import EditTarefaForm from "../components/edit-tarefa-form";
import Breadcrumbs from "../components/breadcrumbs";
import Attachments from "../components/attachments";
import { useToast } from "../components/toast";

type Project = {
  id: number; name: string; code?: string; area?: string; managerName?: string;
  status: string; health: string; progress: number; plannedHours: number;
  plannedCost: number; actualCost: number; plannedStart?: string; plannedEnd?: string;
  projectTypeId?: number; projectPrioritized?: boolean;
};

type TaskItem = {
  id: number; name: string; kind: string; status: string; health: string;
  assignedName?: string; plannedStart?: string; plannedEnd?: string; plannedHours: number;
  rawJson?: string; parentId?: number | null; sprintId?: number | null; projectId?: number;
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
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const projectId = Number(searchParams.get("id"));

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"tarefas" | "sprints" | "comentarios" | "anexos">("tarefas");
  const [showNovaTarefa, setShowNovaTarefa] = useState(false);
  const [showNovoSprint, setShowNovoSprint] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const table = useSortableTable<TaskItem>(tasks);

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

  async function handleDeleteTask(t: TaskItem) {
    if (!confirm(`Excluir tarefa "${t.name}"?`)) return;
    try {
      const r = await fetch(appPath("/api/project-items"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }),
      });
      if (!r.ok) { const b = await r.json() as { error?: string }; throw new Error(b.error ?? "Erro"); }
      toast("Tarefa excluída");
      setRefreshKey((k) => k + 1);
    } catch (err) { toast(err instanceof Error ? err.message : "Erro ao excluir", "error"); }
  }

  const hs = healthStyles[project.health] ?? { bg: "bg-gray-100 text-gray-600", label: project.health };
  const allItems = tasks;
  const epics = allItems.filter((t) => t.kind === "epic");
  const nonEpics = allItems.filter((t) => t.kind !== "epic");
  const doneTasks = nonEpics.filter((t) => t.status === "Concluída").length;
  const totalHours = nonEpics.reduce((s, t) => s + (t.plannedHours ?? 0), 0);

  const taskColumns: ColumnDef<TaskItem>[] = [
    { key: "name", label: "Tarefa", sortable: true, getValue: (r) => r.name },
    { key: "kind", label: "Tipo", sortable: true, filterable: true, filterOptions: ["epic", "task", "subtask", "milestone"], getValue: (r) => r.kind },
    { key: "status", label: "Status", sortable: true, filterable: true, filterOptions: ["A fazer", "Em progresso", "Bloqueada", "Em revisão", "Concluída"], getValue: (r) => r.status },
    { key: "assignedName", label: "Responsável", sortable: true, getValue: (r) => r.assignedName ?? "" },
    { key: "plannedHours", label: "Horas", sortable: true, getValue: (r) => r.plannedHours },
    { key: "plannedEnd", label: "Prazo", sortable: true, getValue: (r) => r.plannedEnd ?? "" },
  ];
  const sortedTasks = table.sortAndFilter(allItems, taskColumns);

  const epicMap = new Map<number, TaskItem>();
  for (const ep of epics) epicMap.set(ep.id, ep);

  type GroupedSection = { epic: TaskItem | null; tasks: TaskItem[] };
  const grouped: GroupedSection[] = [];
  const epicTaskMap = new Map<number, TaskItem[]>();
  const orphanTasks: TaskItem[] = [];

  for (const t of sortedTasks) {
    if (t.kind === "epic") continue;
    if (t.parentId && epicMap.has(t.parentId)) {
      const arr = epicTaskMap.get(t.parentId) ?? [];
      arr.push(t);
      epicTaskMap.set(t.parentId, arr);
    } else {
      orphanTasks.push(t);
    }
  }
  for (const ep of sortedTasks.filter((t) => t.kind === "epic")) {
    grouped.push({ epic: ep, tasks: epicTaskMap.get(ep.id) ?? [] });
  }
  if (orphanTasks.length > 0) grouped.push({ epic: null, tasks: orphanTasks });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Projetos", href: "/painel" }, { label: project.name }]} />

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
          {(["tarefas", "sprints", "comentarios", "anexos"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-[#0c4a3e] text-[#0c4a3e]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t === "tarefas" ? `Tarefas (${tasks.length})` : t === "sprints" ? "Sprints" : t === "comentarios" ? "Comentários" : "Anexos"}
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
          {allItems.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">Nenhuma tarefa neste projeto.</div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-left">
                  {taskColumns.map((col) => (
                    <SortableHeader key={col.key} label={col.label} sortDir={table.getSortDir(col.key)}
                      onSort={() => table.toggleSort(col.key)} sortable={col.sortable} filterable={col.filterable}
                      filterOptions={col.filterOptions} filterValue={table.filters[col.key] ?? ""}
                      onFilter={(v) => table.setFilter(col.key, v)} />
                  ))}
                  <th className="p-3 font-medium w-20"></th>
                </tr></thead>
                <tbody>
                  {grouped.map((section, si) => (
                    <TaskSection key={section.epic?.id ?? "orphan"} section={section} si={si}
                      taskStatusStyles={taskStatusStyles} formatDate={formatDate}
                      onEdit={(t) => setEditingTask({ ...t, projectId })} onDelete={handleDeleteTask} />
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

      {tab === "anexos" && (
        <div className="bg-white rounded-xl border p-5">
          <Attachments entityType="project" entityId={projectId} />
        </div>
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

type GroupedSection = { epic: TaskItem | null; tasks: TaskItem[] };

function TaskSection({ section, si, taskStatusStyles, formatDate, onEdit, onDelete }: {
  section: GroupedSection; si: number;
  taskStatusStyles: Record<string, string>; formatDate: (d?: string) => string;
  onEdit: (t: TaskItem) => void; onDelete: (t: TaskItem) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const epicRow = section.epic;
  const rows = collapsed ? [] : section.tasks;

  return (
    <>
      {epicRow ? (
        <tr className="bg-emerald-50/60 border-b cursor-pointer hover:bg-emerald-50" onClick={() => setCollapsed(!collapsed)}>
          <td className="p-3 font-semibold text-[#0c4a3e] flex items-center gap-2">
            <ChevronDown size={14} className={`transition-transform ${collapsed ? "-rotate-90" : ""}`} />
            <Layers size={14} />
            {epicRow.name}
            <span className="text-xs font-normal text-gray-400 ml-1">({section.tasks.length} tarefas)</span>
          </td>
          <td className="p-3 text-gray-500 text-xs">Épico</td>
          <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${taskStatusStyles[epicRow.status] ?? "bg-gray-100 text-gray-600"}`}>{epicRow.status}</span></td>
          <td className="p-3 text-gray-600">{epicRow.assignedName ?? "—"}</td>
          <td className="p-3 text-gray-600">{epicRow.plannedHours ?? 0}h</td>
          <td className="p-3 text-gray-400 text-xs">{formatDate(epicRow.plannedEnd)}</td>
          <td className="p-3">
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onEdit(epicRow)} className="text-gray-400 hover:text-[#0c4a3e]"><Edit2 size={14} /></button>
              <button onClick={() => onDelete(epicRow)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          </td>
        </tr>
      ) : section.tasks.length > 0 && si > 0 ? (
        <tr className="bg-gray-50/60 border-b">
          <td colSpan={7} className="p-2 pl-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tarefas avulsas</td>
        </tr>
      ) : null}
      {rows.map((t) => (
        <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
          <td className={`p-3 font-medium text-gray-900 max-w-[200px] truncate ${epicRow ? "pl-9" : ""}`}>{t.name}</td>
          <td className="p-3 text-gray-500 capitalize">{t.kind}</td>
          <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${taskStatusStyles[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status}</span></td>
          <td className="p-3 text-gray-600">{t.assignedName ?? "—"}</td>
          <td className="p-3 text-gray-600">{t.plannedHours ?? 0}h</td>
          <td className="p-3 text-gray-400 text-xs">{formatDate(t.plannedEnd)}</td>
          <td className="p-3">
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(t)} className="text-gray-400 hover:text-[#0c4a3e]"><Edit2 size={14} /></button>
              <button onClick={() => onDelete(t)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
