"use client";

import { useEffect, useState, useRef } from "react";
import { appPath } from "@/lib/app-path";
import { GripVertical, Plus } from "lucide-react";
import NovaTarefaForm from "../components/nova-tarefa-form";
import NovoSprintForm from "../components/novo-sprint-form";
import Breadcrumbs from "../components/breadcrumbs";
import { SkeletonKanban } from "../components/skeleton";
import EmptyState from "../components/empty-state";
import { useToast } from "../components/toast";

type KanbanItem = { id: number; name: string; status: string; health: string; assignedName?: string };
type ProjectOption = { id: number; name: string };

const COLUMNS = [
  { key: "planned", label: "Planejadas" },
  { key: "in_progress", label: "Em progresso" },
  { key: "blocked", label: "Bloqueadas" },
  { key: "review", label: "Revisão" },
  { key: "done", label: "Concluídas" },
];

const COLUMN_COLORS: Record<string, string> = {
  planned: "border-t-blue-400",
  in_progress: "border-t-amber-400",
  blocked: "border-t-red-400",
  review: "border-t-purple-400",
  done: "border-t-emerald-400",
};

const HEALTH_DOT: Record<string, string> = {
  on_track: "bg-emerald-500",
  attention: "bg-amber-500",
  late: "bg-red-500",
};

const STATUS_MAP: Record<string, string> = {
  planned: "planned", in_progress: "in_progress", blocked: "blocked", review: "review", done: "done",
};

export default function KanbanPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [columns, setColumns] = useState<Record<string, KanbanItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNovaTarefa, setShowNovaTarefa] = useState(false);
  const [showNovoSprint, setShowNovoSprint] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const dragItem = useRef<{ id: number; fromCol: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    fetch(appPath("/api/projects"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { projects?: ProjectOption[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro ao carregar projetos");
        const list = body.projects ?? [];
        setProjects(list);
        if (list.length > 0) setSelectedProject(list[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    fetch(appPath(`/api/kanban?projectId=${selectedProject}`), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { columns?: Record<string, KanbanItem[]>; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro ao carregar kanban");
        setColumns(body.columns ?? {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProject, refreshKey]);

  function handleDragStart(id: number, fromCol: string) {
    dragItem.current = { id, fromCol };
  }

  function handleDragOver(e: React.DragEvent, colKey: string) {
    e.preventDefault();
    setDragOverCol(colKey);
  }

  function handleDragLeave() {
    setDragOverCol(null);
  }

  async function handleDrop(toCol: string) {
    setDragOverCol(null);
    if (!dragItem.current || dragItem.current.fromCol === toCol) return;
    const { id, fromCol } = dragItem.current;
    dragItem.current = null;

    const item = columns[fromCol]?.find((i) => i.id === id);
    if (!item) return;

    setColumns((prev) => {
      const next = { ...prev };
      next[fromCol] = (prev[fromCol] ?? []).filter((i) => i.id !== id);
      next[toCol] = [...(prev[toCol] ?? []), { ...item, status: STATUS_MAP[toCol] }];
      return next;
    });

    try {
      const r = await fetch(appPath("/api/project-items"), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: STATUS_MAP[toCol] }),
      });
      if (!r.ok) throw new Error("Falha ao mover tarefa");
      const colLabel = COLUMNS.find((c) => c.key === toCol)?.label ?? toCol;
      toast(`Tarefa movida para ${colLabel}`);
    } catch {
      toast("Erro ao atualizar status", "error");
      setRefreshKey((k) => k + 1);
    }
  }

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Kanban" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban</h1>
          <p className="text-sm text-gray-500 mt-1">Arraste tarefas entre colunas para alterar o status</p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <select
              value={selectedProject ?? ""}
              onChange={(e) => setSelectedProject(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-1.5 text-gray-600 bg-white"
            >
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowNovaTarefa(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
            <Plus size={16} /> Nova Tarefa
          </button>
          <button onClick={() => setShowNovoSprint(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0c4a3e] bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
            <Plus size={16} /> Sprint
          </button>
        </div>
      </div>
      <NovaTarefaForm open={showNovaTarefa} onClose={() => setShowNovaTarefa(false)} defaultProjectId={selectedProject} onCreated={() => { setRefreshKey((k) => k + 1); toast("Tarefa criada com sucesso"); }} />
      <NovoSprintForm open={showNovoSprint} onClose={() => setShowNovoSprint(false)} onCreated={() => { setRefreshKey((k) => k + 1); toast("Sprint criado com sucesso"); }} />

      {loading ? (
        <SkeletonKanban />
      ) : projects.length === 0 ? (
        <EmptyState icon="tasks" title="Nenhum projeto encontrado" description="Crie um projeto para começar a usar o Kanban." />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
          {COLUMNS.map((col) => {
            const items = columns[col.key] ?? [];
            return (
              <div key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(col.key)}
                className={`bg-gray-50 rounded-xl min-w-[280px] w-[280px] flex flex-col border-t-4 transition-colors
                  ${COLUMN_COLORS[col.key] ?? "border-t-gray-300"}
                  ${dragOverCol === col.key ? "bg-blue-50 ring-2 ring-blue-200" : ""}
                `}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full border">{items.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item.id, col.key)}
                      className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group animate-fade-in">
                      <div className="flex items-start gap-2">
                        <GripVertical size={14} className="text-gray-300 mt-0.5 opacity-0 group-hover:opacity-100 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className={`w-2 h-2 rounded-full ${HEALTH_DOT[item.health] ?? "bg-gray-400"}`} />
                            {item.assignedName && <span className="text-xs text-gray-500 truncate">{item.assignedName}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className={`text-center text-xs py-8 rounded-lg border-2 border-dashed transition-colors
                      ${dragOverCol === col.key ? "border-blue-300 text-blue-400 bg-blue-50/50" : "border-transparent text-gray-400"}`}>
                      {dragOverCol === col.key ? "Soltar aqui" : "Nenhum item"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
