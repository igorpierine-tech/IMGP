"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Pencil, Trash2, Layers, ChevronDown, ListTree } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "../components/form-dialog";
import { useToast } from "../components/toast";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

type Epic = {
  id: number; projectId: number; projectName?: string; name: string;
  status: string; health: string; assignedName: string | null;
  plannedStart: string | null; plannedEnd: string | null;
  groupName: string | null; childCount: number;
};
type Project = { id: number; name: string };

const STATUS_OPTIONS = ["A fazer", "Em andamento", "Concluído", "Cancelado"];
const HEALTH_COLORS: Record<string, string> = {
  on_track: "bg-emerald-100 text-emerald-700",
  attention: "bg-amber-100 text-amber-700",
  late: "bg-red-100 text-red-700",
};
const HEALTH_LABELS: Record<string, string> = {
  on_track: "No prazo",
  attention: "Atenção",
  late: "Atrasado",
};
const STATUS_COLORS: Record<string, string> = {
  "A fazer": "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  "Em andamento": "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  "Concluído": "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  "Cancelado": "bg-red-100 text-red-600 ring-1 ring-red-200",
};

function EpicAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <div className={`w-6 h-6 rounded-full ${colors[idx]} text-white flex items-center justify-center text-[10px] font-semibold shrink-0`} title={name}>
      {initials}
    </div>
  );
}

export default function EpicosPage() {
  const { toast } = useToast();
  const [epics, setEpics] = useState<Epic[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Epic | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterProject, setFilterProject] = useState<number | "all">("all");

  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [status, setStatus] = useState("A fazer");
  const [assignedName, setAssignedName] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [groupName, setGroupName] = useState("");

  function loadEpics() {
    const url = filterProject === "all"
      ? appPath("/api/epics")
      : appPath(`/api/epics?projectId=${filterProject}`);
    fetch(url, { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setEpics(b.epics ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function loadProjects() {
    fetch(appPath("/api/projects"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setProjects(b.projects ?? []); })
      .catch(() => {});
  }

  useEffect(loadProjects, []);
  useEffect(loadEpics, [filterProject]);

  function openNew() {
    setEditing(null); setName(""); setProjectId(""); setStatus("A fazer");
    setAssignedName(""); setPlannedStart(""); setPlannedEnd(""); setGroupName("");
    setFormOpen(true);
  }
  function openEdit(epic: Epic) {
    setEditing(epic); setName(epic.name); setProjectId(epic.projectId);
    setStatus(epic.status); setAssignedName(epic.assignedName ?? "");
    setPlannedStart(epic.plannedStart ?? ""); setPlannedEnd(epic.plannedEnd ?? "");
    setGroupName(epic.groupName ?? ""); setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || (!editing && !projectId)) return;
    setSaving(true);
    try {
      const payload = editing
        ? { id: editing.id, name: name.trim(), status, assignedName: assignedName.trim() || null, plannedStart: plannedStart || null, plannedEnd: plannedEnd || null, groupName: groupName.trim() || null }
        : { projectId, name: name.trim(), status, assignedName: assignedName.trim() || null, plannedStart: plannedStart || null, plannedEnd: plannedEnd || null, groupName: groupName.trim() || null };
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(appPath("/api/epics"), {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast(editing ? "Épico atualizado" : "Épico criado");
      setFormOpen(false); loadEpics();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(epic: Epic) {
    if (!confirm(`Excluir épico "${epic.name}"? Todos os itens filhos serão desvinculados.`)) return;
    try {
      const r = await fetch(appPath(`/api/epics?id=${epic.id}`), { method: "DELETE", credentials: "include" });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Épico excluído");
      loadEpics();
    } catch (err: any) { setError(err.message); }
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  const grouped = new Map<string, Epic[]>();
  for (const ep of epics) {
    const key = ep.projectName ?? `Projeto #${ep.projectId}`;
    const arr = grouped.get(key) ?? [];
    arr.push(ep);
    grouped.set(key, arr);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumbs items={[{ label: "Gestão" }, { label: "Épicos" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Layers size={24} className="text-[#0c4a3e]" /> Épicos</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os épicos dos projetos para organizar grandes entregas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:ring-2 focus:ring-[#0c4a3e]/20 focus:border-[#0c4a3e] outline-none">
              <option value="all">Todos os projetos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
            <Plus size={16} /> Novo épico
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50/30 rounded-xl border border-gray-200/60 shadow-sm p-4 card-hover animate-scale-in stagger-1">
          <div className="text-sm text-gray-500">Total de Épicos</div>
          <div className="text-2xl font-bold text-gray-900">{epics.length}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50/30 rounded-xl border border-gray-200/60 shadow-sm p-4 card-hover animate-scale-in stagger-2">
          <div className="text-sm text-gray-500">Em andamento</div>
          <div className="text-2xl font-bold text-blue-600">{epics.filter(e => e.status === "Em andamento").length}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 rounded-xl border border-gray-200/60 shadow-sm p-4 card-hover animate-scale-in stagger-3">
          <div className="text-sm text-gray-500">Concluídos</div>
          <div className="text-2xl font-bold text-emerald-600">{epics.filter(e => e.status === "Concluído").length}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/30 rounded-xl border border-gray-200/60 shadow-sm p-4 card-hover animate-scale-in stagger-4">
          <div className="text-sm text-gray-500">Tarefas vinculadas</div>
          <div className="text-2xl font-bold text-purple-600">{epics.reduce((s, e) => s + e.childCount, 0)}</div>
        </div>
      </div>

      {/* Epics grouped by project */}
      {filterProject !== "all" ? (
        <EpicsTable epics={epics} onEdit={openEdit} onDelete={handleDelete} formatDate={formatDate} />
      ) : (
        Array.from(grouped.entries()).map(([projectName, projectEpics]) => (
          <div key={projectName}>
            <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <ListTree size={14} className="text-[#0c4a3e]" /> {projectName}
            </h2>
            <EpicsTable epics={projectEpics} onEdit={openEdit} onDelete={handleDelete} formatDate={formatDate} />
          </div>
        ))
      )}

      {epics.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-8 text-center text-gray-400">
          <Layers size={32} className="mx-auto mb-2 text-gray-300" />
          <p>Nenhum épico encontrado</p>
          <p className="text-xs mt-1">Crie um épico para organizar grandes entregas do projeto</p>
        </div>
      )}

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar Épico" : "Novo Épico"}>
        <form onSubmit={handleSubmit}>
          {!editing && (
            <FormField label="Projeto" required>
              <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))} className={selectClass} required>
                <option value="">Selecione um projeto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="Nome do Épico" required>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ex: Migração para Cloud" required />
          </FormField>
          <FormField label="Grupo / Módulo">
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className={inputClass} placeholder="Ex: Infraestrutura" />
          </FormField>
          <FormField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Responsável">
            <input value={assignedName} onChange={(e) => setAssignedName(e.target.value)} className={inputClass} placeholder="Nome do responsável" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Início previsto">
              <input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Término previsto">
              <input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} className={inputClass} />
            </FormField>
          </div>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label={editing ? "Salvar" : "Criar"} />
        </form>
      </FormDialog>
    </div>
  );
}

function EpicsTable({ epics, onEdit, onDelete, formatDate }: {
  epics: Epic[]; onEdit: (e: Epic) => void; onDelete: (e: Epic) => void; formatDate: (d: string | null) => string;
}) {
  const epicColumns: ColumnDef<Epic>[] = [
    { key: "name", label: "Nome", sortable: true, className: "text-left", getValue: (e) => e.name },
    { key: "status", label: "Status", sortable: true, filterable: true, filterOptions: STATUS_OPTIONS, className: "text-center hidden md:table-cell", getValue: (e) => e.status },
    { key: "health", label: "Saúde", sortable: true, filterable: true, filterOptions: ["on_track", "attention", "late"], className: "text-center hidden md:table-cell", getValue: (e) => e.health },
    { key: "assignedName", label: "Responsável", sortable: true, className: "text-left hidden lg:table-cell", getValue: (e) => e.assignedName ?? "" },
    { key: "plannedStart", label: "Início", sortable: true, className: "text-center hidden lg:table-cell", getValue: (e) => e.plannedStart ?? "" },
    { key: "plannedEnd", label: "Término", sortable: true, className: "text-center hidden lg:table-cell", getValue: (e) => e.plannedEnd ?? "" },
    { key: "childCount", label: "Tarefas", sortable: true, className: "text-center", getValue: (e) => e.childCount },
  ];
  const { toggleSort, setFilter, getSortDir, filters, sortAndFilter } = useSortableTable<Epic>(epics);
  const sorted = sortAndFilter(epics, epicColumns);

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden mb-4">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b"><tr>
          {epicColumns.map((col) => (
            <SortableHeader key={col.key} label={col.label} sortDir={getSortDir(col.key)} onSort={() => toggleSort(col.key)}
              sortable={col.sortable} filterable={col.filterable} filterOptions={col.filterOptions}
              filterValue={filters[col.key] ?? ""} onFilter={(v) => setFilter(col.key, v)} className={col.className ?? ""} />
          ))}
          <th className="w-20"></th>
        </tr></thead>
        <tbody className="divide-y">
          {sorted.map((epic) => {
            const sc = STATUS_COLORS[epic.status] ?? "bg-gray-100 text-gray-600";
            const hc = HEALTH_COLORS[epic.health] ?? "bg-gray-100 text-gray-600";
            const hl = HEALTH_LABELS[epic.health] ?? epic.health;
            return (
              <tr key={epic.id} className="hover:bg-gray-50/80 transition-all group">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 group-hover:text-[#0c4a3e] transition-colors">{epic.name}</div>
                  {epic.groupName && <div className="text-xs text-gray-400 mt-0.5">{epic.groupName}</div>}
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${sc}`}>{epic.status}</span>
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${hc}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hc.includes("emerald") ? "bg-emerald-500" : hc.includes("amber") ? "bg-amber-500" : hc.includes("red") ? "bg-red-500" : "bg-gray-400"}`} />
                    {hl}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {epic.assignedName ? (
                    <div className="flex items-center gap-2">
                      <EpicAvatar name={epic.assignedName} />
                      <span className="text-gray-600 text-sm">{epic.assignedName}</span>
                    </div>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-center text-gray-500 text-xs hidden lg:table-cell">{formatDate(epic.plannedStart)}</td>
                <td className="px-4 py-3 text-center text-gray-500 text-xs hidden lg:table-cell">{formatDate(epic.plannedEnd)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                    <ListTree size={13} /> {epic.childCount}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(epic)} className="p-1 rounded-md text-gray-400 hover:text-[#0c4a3e] hover:bg-emerald-50 transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => onDelete(epic)} className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
