"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Pencil, Trash2, Layers } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass } from "../components/form-dialog";
import { useToast } from "../components/toast";
import ConfirmDialog from "../components/confirm-dialog";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

type ProjectType = { id: number; name: string; description: string | null; sequence: number; active: boolean };

export default function TiposProjetoPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectType | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sequence, setSequence] = useState("0");
  const [active, setActive] = useState(true);

  function load() {
    fetch(appPath("/api/project-types"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.projectTypes ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew() { setEditing(null); setName(""); setDescription(""); setSequence("0"); setActive(true); setFormOpen(true); }
  function openEdit(item: ProjectType) { setEditing(item); setName(item.name); setDescription(item.description ?? ""); setSequence(String(item.sequence)); setActive(item.active); setFormOpen(true); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = { id: editing?.id, name: name.trim(), description: description.trim() || null, sequence: parseInt(sequence) || 0, active };
      const r = await fetch(appPath("/api/project-types"), {
        method: editing ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast(editing ? "Tipo atualizado" : "Tipo criado");
      setFormOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: ProjectType) {
    if (!confirm(`Excluir tipo de projeto "${item.name}"?`)) return;
    try {
      const r = await fetch(appPath("/api/project-types"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Tipo de projeto excluído");
      load();
    } catch (err: any) { setError(err.message); }
  }

  const ptColumns: ColumnDef<ProjectType>[] = [
    { key: "name", label: "Nome", sortable: true, getValue: (t) => t.name },
    { key: "description", label: "Descrição", sortable: true, className: "hidden sm:table-cell", getValue: (t) => t.description ?? "" },
    { key: "sequence", label: "Ordem", sortable: true, className: "text-center", getValue: (t) => t.sequence },
    { key: "active", label: "Status", sortable: true, filterable: true, filterOptions: ["Ativo", "Inativo"], className: "text-center", getValue: (t) => t.active ? "Ativo" : "Inativo" },
  ];
  const { toggleSort, setFilter, getSortDir, filters, sortAndFilter } = useSortableTable<ProjectType>(items);
  const sorted = sortAndFilter(items, ptColumns);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Tipos de Projeto" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Layers size={24} className="text-[#0c4a3e]" /> Tipos de Projeto</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os tipos de projeto disponíveis na plataforma</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Novo tipo
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            {ptColumns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortDir={getSortDir(col.key)} onSort={() => toggleSort(col.key)}
                sortable={col.sortable} filterable={col.filterable} filterOptions={col.filterOptions}
                filterValue={filters[col.key] ?? ""} onFilter={(v) => setFilter(col.key, v)} className={col.className ?? ""} />
            ))}
            <th className="w-12"></th>
          </tr></thead>
          <tbody className="divide-y">
            {sorted.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{item.description || "—"}</td>
                <td className="px-4 py-3 text-center text-gray-500">{item.sequence}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {item.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-[#0c4a3e]"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(item)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum tipo de projeto cadastrado</td></tr>}
          </tbody>
        </table>
      </div>

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar Tipo" : "Novo Tipo de Projeto"}>
        <form onSubmit={handleSubmit}>
          <FormField label="Nome" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
          <FormField label="Descrição"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ordem"><input type="number" value={sequence} onChange={(e) => setSequence(e.target.value)} className={inputClass} /></FormField>
            <FormField label="Ativo">
              <label className="flex items-center gap-2 mt-1 text-sm cursor-pointer">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-gray-300 text-[#0c4a3e] focus:ring-[#0c4a3e]" /> {active ? "Sim" : "Não"}
              </label>
            </FormField>
          </div>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label={editing ? "Salvar" : "Criar"} />
        </form>
      </FormDialog>
    </div>
  );
}
