"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, GanttChart, CalendarDays, Layers } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import { useToast } from "../components/toast";

type GanttItem = {
  id: number; name: string; kind: string; status: string; health: string;
  assignedName: string | null; plannedStart: string | null; plannedEnd: string | null;
  actualStart: string | null; actualEnd: string | null; parentId: number | null; sprintId: number | null;
  dependencies: Array<{ predecessorId: number; type: string; lagDays: number }>;
};
type ProjectOption = { id: number; name: string };
type Sprint = { id: number; name: string; startDate: string; endDate: string };
type TimeScale = "dia" | "semana" | "mes" | "bimestre" | "trimestre" | "semestre" | "ano";

const SCALES: { key: TimeScale; label: string; pxPerDay: number; padDays: number }[] = [
  { key: "dia",       label: "Dias",      pxPerDay: 40,   padDays: 7 },
  { key: "semana",    label: "Semanas",    pxPerDay: 12,   padDays: 14 },
  { key: "mes",       label: "Meses",      pxPerDay: 3,    padDays: 45 },
  { key: "bimestre",  label: "Bimestre",   pxPerDay: 1.5,  padDays: 90 },
  { key: "trimestre", label: "Trimestre",  pxPerDay: 1,    padDays: 180 },
  { key: "semestre",  label: "Semestre",   pxPerDay: 0.55, padDays: 365 },
  { key: "ano",       label: "Ano",        pxPerDay: 0.27, padDays: 730 },
];

const HEALTH_COLORS: Record<string, string> = { on_track: "#10b981", attention: "#f59e0b", late: "#ef4444" };
const STATUS_COLORS: Record<string, string> = { planned: "#93c5fd", in_progress: "#0c4a3e", blocked: "#fca5a5", review: "#c084fc", done: "#6ee7b7" };
const MN = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const STATUS_LABELS: Record<string, string> = { planned: "Planejada", in_progress: "Em progresso", blocked: "Bloqueada", review: "Revisão", done: "Concluída" };
const HEALTH_LABELS: Record<string, string> = { on_track: "No prazo", attention: "Atenção", late: "Atrasado" };
const TASK_COL = 240;
const ROW_H = 32;

function daysBetween(a: Date, b: Date) { return Math.ceil((b.getTime() - a.getTime()) / 86400000); }
function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

type Cell = { label: string; w: number; key: string; weekend?: boolean };

function buildHeaders(scale: TimeScale, start: Date, days: number, ppd: number): [Cell[], Cell[]] {
  const endMs = start.getTime() + days * 86400000;
  const clamp = (a: Date, b: Date) => {
    const f = Math.max(a.getTime(), start.getTime());
    const t = Math.min(b.getTime(), endMs);
    return Math.max(0, Math.ceil((t - f) / 86400000));
  };
  const top: Cell[] = [];
  const bot: Cell[] = [];

  if (scale === "dia" || scale === "semana") {
    let m = new Date(start.getFullYear(), start.getMonth(), 1);
    while (m.getTime() < endMs) {
      const nx = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      const d = clamp(m, nx);
      if (d > 0) top.push({ label: `${MN[m.getMonth()]} ${m.getFullYear()}`, w: d * ppd, key: `tm${m.getFullYear()}${m.getMonth()}` });
      m = nx;
    }
    if (scale === "dia") {
      for (let i = 0; i < days; i++) {
        const dd = new Date(start.getTime() + i * 86400000);
        const wd = dd.getDay();
        bot.push({ label: String(dd.getDate()), w: ppd, key: `d${i}`, weekend: wd === 0 || wd === 6 });
      }
    } else {
      let w = new Date(start);
      const dow = w.getDay();
      if (dow !== 1) w.setDate(w.getDate() - ((dow + 6) % 7));
      while (w.getTime() < endMs) {
        const nx = new Date(w.getTime() + 7 * 86400000);
        const d = clamp(w, nx);
        if (d > 0) {
          const vis = new Date(Math.max(w.getTime(), start.getTime()));
          bot.push({ label: `${vis.getDate()}/${vis.getMonth() + 1}`, w: d * ppd, key: `w${w.toISOString().slice(0, 10)}` });
        }
        w = nx;
      }
    }
  } else {
    const mpp = scale === "mes" ? 1 : scale === "bimestre" ? 2 : scale === "trimestre" ? 3 : scale === "semestre" ? 6 : 12;
    if (scale !== "ano") {
      let y = start.getFullYear();
      const ey = new Date(endMs).getFullYear();
      while (y <= ey) {
        const d = clamp(new Date(y, 0, 1), new Date(y + 1, 0, 1));
        if (d > 0) top.push({ label: String(y), w: d * ppd, key: `y${y}` });
        y++;
      }
    }
    const sp = Math.floor(start.getMonth() / mpp) * mpp;
    let p = new Date(start.getFullYear(), sp, 1);
    while (p.getTime() < endMs) {
      const nx = new Date(p.getFullYear(), p.getMonth() + mpp, 1);
      const d = clamp(p, nx);
      if (d > 0) {
        const mo = p.getMonth();
        const lbl = scale === "mes" ? MN[mo]
          : scale === "bimestre" ? `${MN[mo]}-${MN[mo + 1]}`
          : scale === "trimestre" ? `${Math.floor(mo / 3) + 1}º Tri`
          : scale === "semestre" ? `${Math.floor(mo / 6) + 1}º Sem`
          : String(p.getFullYear());
        bot.push({ label: lbl, w: d * ppd, key: `p${p.getFullYear()}m${mo}` });
      }
      p = nx;
    }
  }
  return [top, bot];
}

export default function GanttPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [items, setItems] = useState<GanttItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scale, setScale] = useState<TimeScale>("mes");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOrigin = useRef({ x: 0, sl: 0 });

  useEffect(() => {
    fetch(appPath("/api/projects"), { credentials: "include" })
      .then(async r => { const b = await r.json() as any; const list = b.projects ?? []; setProjects(list); if (list.length > 0) setSelectedProject(list[0].id); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    fetch(appPath(`/api/gantt?projectId=${selectedProject}`), { credentials: "include" })
      .then(async r => { const b = await r.json() as any; if (!r.ok) throw new Error(b.error ?? "Erro"); setItems(b.items ?? []); setSprints(b.sprints ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const cfg = SCALES.find(s => s.key === scale)!;

  const { tStart, tDays, ppd } = useMemo(() => {
    const dates: Date[] = [];
    for (const it of items) {
      const s = parseDate(it.plannedStart) ?? parseDate(it.actualStart);
      const e = parseDate(it.plannedEnd) ?? parseDate(it.actualEnd);
      if (s) dates.push(s);
      if (e) dates.push(e);
    }
    if (!dates.length) {
      const now = new Date();
      return { tStart: new Date(now.getFullYear(), now.getMonth(), 1), tDays: Math.max(90, Math.ceil(800 / cfg.pxPerDay)), ppd: cfg.pxPerDay };
    }
    const minD = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxD = new Date(Math.max(...dates.map(d => d.getTime())));
    minD.setDate(minD.getDate() - cfg.padDays);
    maxD.setDate(maxD.getDate() + cfg.padDays);
    return { tStart: minD, tDays: Math.max(30, daysBetween(minD, maxD)), ppd: cfg.pxPerDay };
  }, [items, scale]);

  const [topH, botH] = useMemo(() => buildHeaders(scale, tStart, tDays, ppd), [scale, tStart, tDays, ppd]);
  const tlW = tDays * ppd;
  const todayPx = daysBetween(tStart, new Date()) * ppd;
  type GanttRow = { type: "epic" | "task" | "orphan-header"; item: GanttItem; taskCount?: number };
  const ganttRows = useMemo(() => {
    function epicNum(name: string): number { const m = name.match(/^(\d+)/); return m ? parseInt(m[1], 10) : Infinity; }
    function itemDate(it: GanttItem): string { return it.plannedEnd ?? it.plannedStart ?? it.actualEnd ?? it.actualStart ?? "￿"; }
    const epics = items.filter(i => i.kind === "epic").sort((a, b) => epicNum(a.name) - epicNum(b.name));
    const epicIds = new Set(epics.map(e => e.id));
    const tasksByEpic = new Map<number, GanttItem[]>();
    const orphanTasks: GanttItem[] = [];
    for (const it of items) {
      if (it.kind === "epic") continue;
      if (it.parentId && epicIds.has(it.parentId)) {
        const arr = tasksByEpic.get(it.parentId) ?? [];
        arr.push(it);
        tasksByEpic.set(it.parentId, arr);
      } else {
        orphanTasks.push(it);
      }
    }
    for (const [, arr] of tasksByEpic) arr.sort((a, b) => itemDate(a).localeCompare(itemDate(b)));
    orphanTasks.sort((a, b) => itemDate(a).localeCompare(itemDate(b)));
    const rows: GanttRow[] = [];
    for (const ep of epics) {
      const children = tasksByEpic.get(ep.id) ?? [];
      rows.push({ type: "epic", item: ep, taskCount: children.length });
      for (const t of children) rows.push({ type: "task", item: t });
    }
    if (orphanTasks.length > 0) {
      for (const t of orphanTasks) rows.push({ type: "task", item: t });
    }
    return rows;
  }, [items]);
  const displaySprints = useMemo(() => sprints.filter(s => parseDate(s.startDate) && parseDate(s.endDate)), [sprints]);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollLeft = Math.max(0, todayPx - scrollRef.current.clientWidth / 2);
    });
  }, [scale, todayPx]);

  function scrollToToday() {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: Math.max(0, todayPx - scrollRef.current.clientWidth / 2), behavior: "smooth" });
  }

  function onDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    dragging.current = true;
    dragOrigin.current = { x: e.clientX, sl: scrollRef.current?.scrollLeft ?? 0 };
    (e.currentTarget as HTMLElement).style.cursor = "grabbing";
  }
  function onMove(e: React.MouseEvent) {
    if (dragging.current && scrollRef.current) scrollRef.current.scrollLeft = dragOrigin.current.sl - (e.clientX - dragOrigin.current.x);
  }
  function onUp(e: React.MouseEvent) {
    dragging.current = false;
    (e.currentTarget as HTMLElement).style.cursor = "";
  }

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Gantt" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GanttChart size={24} className="text-[#0c4a3e]" /> Gráfico de Gantt
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cronograma visual das tarefas do projeto</p>
        </div>
        {projects.length > 0 && (
          <select value={selectedProject ?? ""} onChange={e => setSelectedProject(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0c4a3e]/20">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Scale selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm overflow-x-auto">
          {SCALES.map(s => (
            <button key={s.key} onClick={() => setScale(s.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                scale === s.key ? "bg-[#0c4a3e] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
              }`}>{s.label}</button>
          ))}
        </div>
        <button onClick={scrollToToday}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0c4a3e] bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors">
          <CalendarDays size={14} /> Hoje
        </button>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-8 text-center text-gray-400">Nenhuma tarefa com datas planejadas neste projeto</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="flex">
            {/* Fixed task column */}
            <div className="shrink-0 border-r border-gray-200 bg-white z-10" style={{ width: TASK_COL }}>
              {topH.length > 0 && <div className="border-b bg-gray-50" style={{ height: 28 }} />}
              <div className="border-b bg-gray-50 px-3 flex items-center text-xs font-medium text-gray-500" style={{ height: ROW_H }}>Tarefa</div>
              {displaySprints.map(s => (
                <div key={`sl${s.id}`} className="border-b border-gray-50 bg-purple-50/30 px-3 flex items-center text-xs font-medium text-purple-600 truncate" style={{ height: ROW_H }}>{s.name}</div>
              ))}
              {ganttRows.map(row => row.type === "epic" ? (
                <div key={`tl${row.item.id}`} className="border-b border-gray-100 bg-emerald-50/60 px-3 flex items-center gap-1.5" style={{ height: ROW_H }}>
                  <Layers size={12} className="text-[#0c4a3e] shrink-0" />
                  <span className="text-xs font-semibold text-[#0c4a3e] truncate">{row.item.name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">({row.taskCount})</span>
                </div>
              ) : (
                <div key={`tl${row.item.id}`} className="border-b border-gray-50 pl-7 pr-3 flex items-center gap-1.5 hover:bg-gray-50/50" style={{ height: ROW_H }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: HEALTH_COLORS[row.item.health] ?? "#94a3b8" }} />
                  <span className="text-xs text-gray-700 truncate">{row.item.name}</span>
                </div>
              ))}
            </div>

            {/* Scrollable timeline */}
            <div ref={scrollRef} className="flex-1 overflow-x-auto select-none cursor-grab"
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
              <div style={{ width: tlW }} className="relative">
                {/* Today line */}
                {todayPx >= 0 && todayPx <= tlW && (
                  <div className="absolute top-0 bottom-0 w-px bg-red-400/70 z-20 pointer-events-none" style={{ left: todayPx }}>
                    <div className="absolute -top-0 -translate-x-1/2 bg-red-400 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-b">Hoje</div>
                  </div>
                )}

                {/* Top header */}
                {topH.length > 0 && (
                  <div className="flex border-b bg-gray-50" style={{ height: 28 }}>
                    {topH.map(h => (
                      <div key={h.key} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-center border-r border-gray-100"
                        style={{ width: h.w, minWidth: h.w }}>{h.w > 30 ? h.label : ""}</div>
                    ))}
                  </div>
                )}

                {/* Bottom header */}
                <div className="flex border-b bg-gray-50" style={{ height: ROW_H }}>
                  {botH.map(h => (
                    <div key={h.key}
                      className={`text-center text-xs font-medium flex items-center justify-center border-r border-gray-100/70 ${h.weekend ? "text-gray-300 bg-gray-100/50" : "text-gray-500"}`}
                      style={{ width: h.w, minWidth: h.w }}>{h.w > 18 ? h.label : ""}</div>
                  ))}
                </div>

                {/* Sprint bars */}
                {displaySprints.map(sp => {
                  const sDate = parseDate(sp.startDate)!;
                  const eDate = parseDate(sp.endDate)!;
                  const left = daysBetween(tStart, sDate) * ppd;
                  const width = Math.max(4, daysBetween(sDate, eDate) * ppd);
                  return (
                    <div key={`sb${sp.id}`} className="relative bg-purple-50/30 border-b border-gray-50" style={{ height: ROW_H }}>
                      <div className="absolute top-1.5 h-5 rounded bg-purple-200/60 border border-purple-300/50 text-[10px] text-purple-700 flex items-center px-2 truncate"
                        style={{ left, width }}>{width > 60 ? sp.name : ""}</div>
                    </div>
                  );
                })}

                {/* Task bars */}
                {ganttRows.map(row => {
                  const it = row.item;
                  if (row.type === "epic") {
                    return <div key={`tb${it.id}`} className="relative border-b border-gray-100 bg-emerald-50/30" style={{ height: ROW_H }} />;
                  }
                  const rawStart = parseDate(it.plannedStart) ?? parseDate(it.actualStart);
                  const rawEnd = parseDate(it.plannedEnd) ?? parseDate(it.actualEnd);
                  if (!rawStart && !rawEnd) return <div key={`tb${it.id}`} className="relative border-b border-gray-50" style={{ height: ROW_H }} />;
                  const DEFAULT_DAYS = 5;
                  const sDate = rawStart ?? (rawEnd ? new Date(rawEnd.getTime() - DEFAULT_DAYS * 86400000) : null)!;
                  const eDate = rawEnd ?? (rawStart ? new Date(rawStart.getTime() + DEFAULT_DAYS * 86400000) : null);
                  const left = daysBetween(tStart, sDate) * ppd;
                  const span = eDate ? daysBetween(sDate, eDate) : DEFAULT_DAYS;
                  const width = Math.max(ppd * 2, span * ppd);
                  const barColor = STATUS_COLORS[it.status] ?? "#94a3b8";
                  return (
                    <div key={`tb${it.id}`} className="relative border-b border-gray-50 hover:bg-gray-50/50 group" style={{ height: ROW_H }}>
                      <div className="absolute top-1.5 h-5 rounded shadow-sm flex items-center px-1.5 text-[10px] text-white font-medium truncate cursor-default group-hover:shadow-md transition-shadow"
                        style={{ left, width, backgroundColor: barColor }}
                        title={`${it.name}\n${it.assignedName ?? "Sem responsável"}\n${STATUS_LABELS[it.status] ?? it.status}`}>
                        {width > 60 ? it.name : ""}
                      </div>
                      {it.actualStart && it.actualEnd && (
                        <div className="absolute top-2.5 h-3 rounded-sm opacity-40"
                          style={{
                            left: daysBetween(tStart, parseDate(it.actualStart)!) * ppd,
                            width: Math.max(4, daysBetween(parseDate(it.actualStart)!, parseDate(it.actualEnd)!) * ppd),
                            backgroundColor: HEALTH_COLORS[it.health] ?? "#94a3b8",
                          }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-t bg-gray-50 text-xs text-gray-500 flex-wrap">
            <span className="font-medium">Status:</span>
            {Object.entries(STATUS_COLORS).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ backgroundColor: c }} /> {STATUS_LABELS[k]}</span>
            ))}
            <span className="ml-2 border-l pl-2 font-medium">Saúde:</span>
            {Object.entries(HEALTH_COLORS).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} /> {HEALTH_LABELS[k]}</span>
            ))}
            <span className="ml-2 flex items-center gap-1"><span className="w-px h-3 bg-red-400/70" /> Hoje</span>
          </div>
        </div>
      )}
    </div>
  );
}
