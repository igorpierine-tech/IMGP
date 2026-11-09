"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Play, Pause, Square, Clock, Timer, Pencil, Trash2 } from "lucide-react";
import FormDialog, { FormField, FormActions, inputClass } from "../components/form-dialog";
import Breadcrumbs from "../components/breadcrumbs";
import { useToast } from "../components/toast";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

type TimeEntry = { id: number; projectId: number; itemId: number; userId: string; activity: string; startedAt: string; endedAt: string | null; totalMinutes: number; status: string; pausedSeconds: number };

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  running: { label: "Em andamento", color: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Pausado", color: "bg-amber-100 text-amber-700" },
  closed: { label: "Finalizado", color: "bg-gray-100 text-gray-600" },
};

export default function TimesheetPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemId, setItemId] = useState("");
  const [activity, setActivity] = useState("");
  const [starting, setStarting] = useState(false);

  function load() {
    fetch(appPath("/api/time-entries"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setEntries(b.entries ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const running = entries.find(e => e.status === "running");

  async function handleStart() {
    if (!itemId.trim()) return;
    setStarting(true);
    try {
      const r = await fetch(appPath("/api/time-entries"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", itemId: parseInt(itemId), activity: activity.trim() || undefined }),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast("Timer iniciado");
      setItemId(""); setActivity(""); load();
    } catch (err: any) { setError(err.message); }
    finally { setStarting(false); }
  }

  async function handleAction(entry: TimeEntry, action: "pause" | "close") {
    try {
      const r = await fetch(appPath("/api/time-entries"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemId: entry.itemId }),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast(action === "pause" ? "Timer pausado" : "Timer finalizado");
      load();
    } catch (err: any) { setError(err.message); }
  }

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editActivity, setEditActivity] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  function openEditEntry(entry: TimeEntry) {
    setEditingEntry(entry); setEditActivity(entry.activity); setEditMinutes(String(entry.totalMinutes)); setEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;
    setEditSaving(true);
    try {
      const r = await fetch(appPath("/api/time-entries"), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingEntry.id, activity: editActivity.trim(), totalMinutes: parseInt(editMinutes) || 0 }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Apontamento atualizado"); setEditOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setEditSaving(false); }
  }

  async function handleDeleteEntry(entry: TimeEntry) {
    if (!confirm(`Excluir apontamento "${entry.activity}"?`)) return;
    try {
      const r = await fetch(appPath("/api/time-entries"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Apontamento excluído"); load();
    } catch (err: any) { setError(err.message); }
  }

  const totalToday = entries.filter(e => e.status === "closed" && e.endedAt && formatDate(e.endedAt) === formatDate(new Date().toISOString())).reduce((s, e) => s + e.totalMinutes, 0);
  const totalWeek = entries.filter(e => e.status === "closed").reduce((s, e) => s + e.totalMinutes, 0);

  const tsColumns: ColumnDef<TimeEntry>[] = [
    { key: "activity", label: "Atividade", sortable: true, getValue: (e) => e.activity },
    { key: "date", label: "Data", sortable: true, getValue: (e) => new Date(e.startedAt).getTime() },
    { key: "start", label: "Início", sortable: false },
    { key: "end", label: "Fim", sortable: false },
    { key: "duration", label: "Duração", sortable: true, getValue: (e) => e.totalMinutes },
    { key: "status", label: "Status", sortable: true, filterable: true, filterOptions: ["running", "paused", "closed"], getValue: (e) => e.status },
  ];
  const { toggleSort, setFilter: setColFilter, getSortDir, filters: colFilters, sortAndFilter } = useSortableTable<TimeEntry>(entries, "date", "desc");
  const sortedEntries = sortAndFilter(entries, tsColumns);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Gestão" }, { label: "Timesheet" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Timer size={24} className="text-[#0c4a3e]" /> Timesheet</h1>
        <p className="text-sm text-gray-500 mt-1">Registre e acompanhe o tempo dedicado às tarefas</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4">
          <div className="text-sm text-gray-500">Hoje</div>
          <div className="text-2xl font-bold text-gray-900">{formatDuration(totalToday)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4">
          <div className="text-sm text-gray-500">Últimas entradas</div>
          <div className="text-2xl font-bold text-gray-900">{formatDuration(totalWeek)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4">
          <div className="text-sm text-gray-500">Status</div>
          <div className="text-2xl font-bold">
            {running ? <span className="text-emerald-600 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo</span> : <span className="text-gray-400">Parado</span>}
          </div>
        </div>
      </div>

      {/* Active timer or Start form */}
      {running ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-medium text-emerald-800">Timer ativo</div>
            <div className="text-lg font-bold text-emerald-900 mt-1">{running.activity}</div>
            <div className="text-xs text-emerald-600 mt-1">Iniciado às {formatTime(running.startedAt)}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleAction(running, "pause")} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600">
              <Pause size={16} /> Pausar
            </button>
            <button onClick={() => handleAction(running, "close")} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600">
              <Square size={16} /> Finalizar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-5">
          <div className="text-sm font-medium text-gray-700 mb-3">Iniciar apontamento</div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-gray-500">ID da tarefa</label>
              <input value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="ex: 42" className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-500">Atividade (opcional)</label>
              <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Descrição da atividade..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={handleStart} disabled={!itemId.trim() || starting} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg disabled:opacity-50">
              {starting ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} Iniciar
            </button>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      {/* Entries table */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 text-sm font-medium text-gray-700">Últimos apontamentos</div>
        <table className="w-full text-sm">
          <thead className="border-b"><tr>
            {tsColumns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortDir={getSortDir(col.key)} onSort={() => toggleSort(col.key)}
                sortable={col.sortable} filterable={col.filterable} filterOptions={col.filterOptions}
                filterValue={colFilters[col.key] ?? ""} onFilter={(v) => setColFilter(col.key, v)} className="text-center" />
            ))}
            <th className="w-16"></th>
          </tr></thead>
          <tbody className="divide-y">
            {sortedEntries.slice(0, 50).map((entry) => {
              const st = STATUS_LABELS[entry.status] ?? { label: entry.status, color: "bg-gray-100 text-gray-600" };
              return (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.activity}</td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">{formatDate(entry.startedAt)}</td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">{formatTime(entry.startedAt)}</td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">{entry.endedAt ? formatTime(entry.endedAt) : "—"}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{entry.status === "closed" ? formatDuration(entry.totalMinutes) : "—"}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3">
                    {entry.status === "closed" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditEntry(entry)} className="text-gray-400 hover:text-[#0c4a3e]"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteEntry(entry)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum apontamento registrado</td></tr>}
          </tbody>
        </table>
      </div>
      <FormDialog open={editOpen} onClose={() => setEditOpen(false)} title="Editar Apontamento">
        <form onSubmit={handleEditSubmit}>
          <FormField label="Atividade" required>
            <input value={editActivity} onChange={(e) => setEditActivity(e.target.value)} className={inputClass} required />
          </FormField>
          <FormField label="Duração (minutos)">
            <input type="number" min={0} value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)} className={inputClass} />
          </FormField>
          <FormActions onCancel={() => setEditOpen(false)} loading={editSaving} label="Salvar" />
        </form>
      </FormDialog>
    </div>
  );
}
