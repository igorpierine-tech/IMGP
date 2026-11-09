"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Pencil, Trash2, Copy, FileStack } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass } from "../components/form-dialog";
import { useToast } from "../components/toast";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

type Template = { id: number; name: string; description: string | null; projectTypeId: number | null; phasesJson: any; active: boolean };

export default function TemplatesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function load() {
    fetch(appPath("/api/templates"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.templates ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const [editing, setEditing] = useState<Template | null>(null);

  function openNew() { setEditing(null); setName(""); setDescription(""); setFormOpen(true); }

  function openEdit(item: Template) {
    setEditing(item); setName(item.name); setDescription(item.description ?? ""); setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = editing
        ? { id: editing.id, name: name.trim(), description: description.trim() || null }
        : { name: name.trim(), description: description.trim() || null };
      const r = await fetch(appPath("/api/templates"), {
        method: editing ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast(editing ? "Template atualizado" : "Template criado");
      setFormOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeactivate(item: Template) {
    if (!confirm(`Desativar template "${item.name}"?`)) return;
    try {
      const r = await fetch(appPath("/api/templates"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Template desativado");
      load();
    } catch (err: any) { setError(err.message); }
  }

  const tplColumns: ColumnDef<Template>[] = [
    { key: "name", label: "Nome", sortable: true, getValue: (t) => t.name },
    { key: "description", label: "Descrição", sortable: true, className: "hidden sm:table-cell", getValue: (t) => t.description ?? "" },
    { key: "phases", label: "Fases", sortable: true, className: "text-center", getValue: (t) => Array.isArray(t.phasesJson) ? t.phasesJson.length : 0 },
  ];
  const { toggleSort, getSortDir, sortAndFilter } = useSortableTable<Template>(items);
  const sorted = sortAndFilter(items, tplColumns);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Templates de Projeto" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileStack size={24} className="text-[#0c4a3e]" /> Templates de Projeto</h1>
          <p className="text-sm text-gray-500 mt-1">Modelos reutilizáveis para criação de projetos</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Novo template
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            {tplColumns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortDir={getSortDir(col.key)} onSort={() => toggleSort(col.key)}
                sortable={col.sortable} className={col.className ?? ""} />
            ))}
            <th className="w-16"></th>
          </tr></thead>
          <tbody className="divide-y">
            {sorted.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{item.description || "—"}</td>
                <td className="px-4 py-3 text-center text-gray-500">{Array.isArray(item.phasesJson) ? item.phasesJson.length : 0}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-[#0c4a3e]"><Pencil size={15} /></button>
                    <button onClick={() => handleDeactivate(item)} className="text-gray-400 hover:text-red-500" title="Desativar"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhum template cadastrado</td></tr>}
          </tbody>
        </table>
      </div>

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar Template" : "Novo Template"}>
        <form onSubmit={handleSubmit}>
          <FormField label="Nome" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
          <FormField label="Descrição"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></FormField>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label={editing ? "Salvar" : "Criar"} />
        </form>
      </FormDialog>
    </div>
  );
}
