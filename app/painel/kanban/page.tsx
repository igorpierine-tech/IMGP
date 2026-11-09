"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, GripVertical, Plus } from "lucide-react";
import NovaTarefaForm from "../components/nova-tarefa-form";
import NovoSprintForm from "../components/novo-sprint-form";

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

export default function KanbanPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [columns, setColumns] = useState<Record<string, KanbanItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNovaTarefa, setShowNovaTarefa] = useState(false);
  const [showNovoSprint, setShowNovoSprint] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban</h1>
          <p className="text-sm text-gray-500 mt-1">Visão de tarefas por status</p>
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
      <NovaTarefaForm open={showNovaTarefa} onClose={() => setShowNovaTarefa(false)} defaultProjectId={selectedProject} onCreated={() => setRefreshKey((k) => k + 1)} />
      <NovoSprintForm open={showNovoSprint} onClose={() => setShowNovoSprint(false)} onCreated={() => setRefreshKey((k) => k + 1)} />

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando kanban...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center"><p className="text-sm text-gray-400">Nenhum projeto encontrado.</p></div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
          {COLUMNS.map((col) => {
            const items = columns[col.key] ?? [];
            return (
              <div key={col.key} className={`bg-gray-50 rounded-xl min-w-[280px] w-[280px] flex flex-col border-t-4 ${COLUMN_COLORS[col.key] ?? "border-t-gray-300"}`}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full border">{items.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
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
                  {items.length === 0 && <div className="text-center text-xs text-gray-400 py-8">Nenhum item</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
