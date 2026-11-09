"use client";

import { useEffect, useState, useMemo } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, ChevronLeft, ChevronRight, GanttChart } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import { useToast } from "../components/toast";

type GanttItem = {
  id: number; name: string; kind: string; status: string; health: string;
  assignedName: string | null; plannedStart: string | null; plannedEnd: string | null;
  actualStart: string | null; actualEnd: string | null; parentId: number | null; sprintId: number | null;
  dependencies: Array<{ predecessorId: number; type: string; lagDays: number }>;
};
type ProjectInfo = { id: number; name: string; plannedStart: string | null; plannedEnd: string | null };
type Sprint = { id: number; name: string; startDate: string; endDate: string };
type ProjectOption = { id: number; name: string };

const HEALTH_COLORS: Record<string, string> = { on_track: "#10b981", attention: "#f59e0b", late: "#ef4444" };
const STATUS_COLORS: Record<string, string> = { planned: "#93c5fd", in_progress: "#0c4a3e", blocked: "#fca5a5", review: "#c084fc", done: "#6ee7b7" };

function daysBetween(a: Date, b: Date) { return Math.ceil((b.getTime() - a.getTime()) / 86400000); }

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export default function GanttPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [items, setItems] = useState<GanttItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(appPath("/api/projects"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; const list = b.projects ?? []; setProjects(list); if (list.length > 0) setSelectedProject(list[0].id); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    fetch(appPath(`/api/gantt?projectId=${selectedProject}`), { credentials: "include" })
      .then(async (r) => {
        const b = await r.json() as any;
        if (!r.ok) throw new Error(b.error ?? "Erro");
        setProjectInfo(b.project); setItems(b.items ?? []); setSprints(b.sprints ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const { timelineStart, timelineDays, colWidth } = useMemo(() => {
    const dates: Date[] = [];
    for (const item of items) {
      const s = parseDate(item.plannedStart) ?? parseDate(item.actualStart);
      const e = parseDate(item.plannedEnd) ?? parseDate(item.actualEnd);
      if (s) dates.push(s);
      if (e) dates.push(e);
    }
    if (dates.length === 0) {
      const now = new Date();
      return { timelineStart: now, timelineDays: 30, colWidth: 28 };
    }
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    min.setDate(min.getDate() - 3);
    max.setDate(max.getDate() + 3);
    const days = Math.max(14, daysBetween(min, max));
    return { timelineStart: min, timelineDays: days, colWidth: Math.max(20, Math.min(40, 800 / days)) };
  }, [items]);

  function dayOffset(d: Date) { return daysBetween(timelineStart, d); }

  function generateMonthHeaders() {
    const headers: Array<{ label: string; startCol: number; span: number }> = [];
    let d = new Date(timelineStart);
    while (daysBetween(d, new Date(timelineStart.getTime() + timelineDays * 86400000)) > 0) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const startCol = Math.max(0, dayOffset(monthStart));
      const endCol = Math.min(timelineDays, dayOffset(monthEnd) + 1);
      if (endCol > startCol) {
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        headers.push({ label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, startCol, span: endCol - startCol });
      }
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return headers;
  }

  const monthHeaders = generateMonthHeaders();
  const todayOffset = dayOffset(new Date());

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Gantt" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><GanttChart size={24} className="text-[#0c4a3e]" /> Gráfico de Gantt</h1>
          <p className="text-sm text-gray-500 mt-1">Cronograma visual das tarefas do projeto</p>
        </div>
        {projects.length > 0 && (
          <select value={selectedProject ?? ""} onChange={(e) => setSelectedProject(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0c4a3e]/20">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-8 text-center text-gray-400">Nenhuma tarefa com datas planejadas neste projeto</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Month headers */}
            <div className="flex border-b bg-gray-50">
              <div className="w-52 shrink-0 px-3 py-2 text-xs font-medium text-gray-500 border-r">Tarefa</div>
              <div className="flex-1 flex">
                {monthHeaders.map((h, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-500 py-2 border-r border-gray-100"
                    style={{ width: h.span * colWidth, minWidth: h.span * colWidth }}>{h.label}</div>
                ))}
              </div>
            </div>

            {/* Sprint rows */}
            {sprints.map((sprint) => {
              const sStart = parseDate(sprint.startDate);
              const sEnd = parseDate(sprint.endDate);
              if (!sStart || !sEnd) return null;
              const left = dayOffset(sStart) * colWidth;
              const width = Math.max(colWidth, daysBetween(sStart, sEnd) * colWidth);
              return (
                <div key={`sprint-${sprint.id}`} className="flex border-b border-gray-50 bg-purple-50/30">
                  <div className="w-52 shrink-0 px-3 py-1.5 text-xs font-medium text-purple-600 border-r truncate">{sprint.name}</div>
                  <div className="flex-1 relative h-7">
                    <div className="absolute top-1 h-5 rounded bg-purple-200/60 border border-purple-300/50 text-[10px] text-purple-700 flex items-center px-2 truncate"
                      style={{ left, width }}>{sprint.name}</div>
                  </div>
                </div>
              );
            })}

            {/* Task rows */}
            {items.map((item) => {
              const start = parseDate(item.plannedStart) ?? parseDate(item.actualStart);
              const end = parseDate(item.plannedEnd) ?? parseDate(item.actualEnd);
              if (!start) return null;
              const left = dayOffset(start) * colWidth;
              const width = end ? Math.max(colWidth, daysBetween(start, end) * colWidth) : colWidth * 2;
              const barColor = STATUS_COLORS[item.status] ?? "#94a3b8";
              const healthColor = HEALTH_COLORS[item.health] ?? "#94a3b8";
              return (
                <div key={item.id} className="flex border-b border-gray-50 hover:bg-gray-50/50 group">
                  <div className="w-52 shrink-0 px-3 py-1.5 text-xs text-gray-700 border-r truncate flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: healthColor }} />
                    {item.name}
                  </div>
                  <div className="flex-1 relative h-8">
                    {/* Today line */}
                    {todayOffset >= 0 && todayOffset <= timelineDays && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-300 z-10" style={{ left: todayOffset * colWidth }} />
                    )}
                    {/* Bar */}
                    <div className="absolute top-1.5 h-5 rounded shadow-sm flex items-center px-1.5 text-[10px] text-white font-medium truncate cursor-default transition-all group-hover:shadow-md"
                      style={{ left, width, backgroundColor: barColor }}
                      title={`${item.name}\n${item.assignedName ?? "Sem responsável"}\n${item.status}`}>
                      {width > 60 && item.name}
                    </div>
                    {/* Actual progress overlay */}
                    {item.actualStart && item.actualEnd && (
                      <div className="absolute top-2.5 h-3 rounded-sm opacity-40"
                        style={{
                          left: dayOffset(parseDate(item.actualStart)!) * colWidth,
                          width: Math.max(4, daysBetween(parseDate(item.actualStart)!, parseDate(item.actualEnd)!) * colWidth),
                          backgroundColor: healthColor,
                        }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-t bg-gray-50 text-xs text-gray-500 flex-wrap">
            <span className="font-medium">Status:</span>
            {Object.entries(STATUS_COLORS).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ backgroundColor: c }} /> {k === "in_progress" ? "Em progresso" : k === "planned" ? "Planejada" : k === "blocked" ? "Bloqueada" : k === "review" ? "Revisão" : "Concluída"}</span>
            ))}
            <span className="ml-2 border-l pl-2 font-medium">Saúde:</span>
            {Object.entries(HEALTH_COLORS).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} /> {k === "on_track" ? "No prazo" : k === "attention" ? "Atenção" : "Atrasado"}</span>
            ))}
            <span className="ml-2 flex items-center gap-1"><span className="w-px h-3 bg-red-300" /> Hoje</span>
          </div>
        </div>
      )}
    </div>
  );
}
