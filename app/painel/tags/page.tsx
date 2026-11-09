"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Pencil, Trash2, Tag } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass } from "../components/form-dialog";
import { useToast } from "../components/toast";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

type TagItem = { id: number; name: string; color: string | null; description: string | null };

export default function TagsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TagItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0c4a3e");
  const [description, setDescription] = useState("");

  function load() {
    fetch(appPath("/api/tags"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.tags ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew() { setEditing(null); setName(""); setColor("#0c4a3e"); setDescription(""); setFormOpen(true); }
  function openEdit(item: TagItem) { setEditing(item); setName(item.name); setColor(item.color ?? "#0c4a3e"); setDescription(item.description ?? ""); setFormOpen(true); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = editing
        ? { action: "create", id: editing.id, name: name.trim(), color, description: description.trim() || null }
        : { action: "create", name: name.trim(), color, description: description.trim() || null };
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(appPath("/api/tags"), {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast(editing ? "Tag atualizada" : "Tag criada");
      setFormOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: TagItem) {
    if (!confirm(`Excluir tag "${item.name}"?`)) return;
    try {
      const r = await fetch(appPath("/api/tags"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Tag excluída");
      load();
    } catch (err: any) { setError(err.message); }
  }

  const tagColumns: ColumnDef<TagItem>[] = [
    { key: "color", label: "Cor", sortable: false },
    { key: "name", label: "Nome", sortable: true, getValue: (t) => t.name },
    { key: "description", label: "Descrição", sortable: true, className: "hidden sm:table-cell", getValue: (t) => t.description ?? "" },
  ];
  const { toggleSort, getSortDir, sortAndFilter } = useSortableTable<TagItem>(items);
  const sorted = sortAndFilter(items, tagColumns);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Tags" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Tag size={24} className="text-[#0c4a3e]" /> Tags</h1>
          <p className="text-sm text-gray-500 mt-1">Crie etiquetas para organizar projetos e tarefas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Nova tag
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            {tagColumns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortDir={getSortDir(col.key)} onSort={() => toggleSort(col.key)}
                sortable={col.sortable} className={col.className ?? ""} />
            ))}
            <th className="w-20"></th>
          </tr></thead>
          <tbody className="divide-y">
            {sorted.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 w-16">
                  <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: item.color ?? "#ccc" }} />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: item.color ?? "#666" }}>
                    {item.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{item.description || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-[#0c4a3e]"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(item)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhuma tag cadastrada</td></tr>}
          </tbody>
        </table>
      </div>

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar Tag" : "Nova Tag"}>
        <form onSubmit={handleSubmit}>
          <FormField label="Nome" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
          <FormField label="Cor">
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded border border-gray-300 cursor-pointer" />
              <input value={color} onChange={(e) => setColor(e.target.value)} className={inputClass} placeholder="#000000" />
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: color }}>Preview</span>
            </div>
          </FormField>
          <FormField label="Descrição"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></FormField>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label={editing ? "Salvar" : "Criar"} />
        </form>
      </FormDialog>
    </div>
  );
}
