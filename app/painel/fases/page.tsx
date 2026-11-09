"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Pencil, Trash2, GitBranch } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "../components/form-dialog";
import { useToast } from "../components/toast";

type Phase = { id: number; projectRef: string; projectName: string; name: string; description: string | null; sequence: number; active: boolean };

export default function FasesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Phase | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectRef, setProjectRef] = useState("");
  const [projectName, setProjectName] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sequence, setSequence] = useState("0");
  const [active, setActive] = useState(true);

  function load() {
    fetch(appPath("/api/phases"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.phases ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew() { setEditing(null); setProjectRef(""); setProjectName(""); setName(""); setDescription(""); setSequence("0"); setActive(true); setFormOpen(true); }
  function openEdit(item: Phase) { setEditing(item); setProjectRef(item.projectRef); setProjectName(item.projectName); setName(item.name); setDescription(item.description ?? ""); setSequence(String(item.sequence)); setActive(item.active); setFormOpen(true); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = editing
        ? { id: editing.id, name: name.trim(), description: description.trim() || null, sequence: parseInt(sequence) || 0, active }
        : { projectRef: projectRef.trim(), projectName: projectName.trim(), name: name.trim(), description: description.trim() || null, sequence: parseInt(sequence) || 0 };
      const r = await fetch(appPath("/api/phases"), {
        method: editing ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast(editing ? "Fase atualizada" : "Fase criada");
      setFormOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: Phase) {
    if (!confirm(`Excluir fase "${item.name}"?`)) return;
    try {
      const r = await fetch(appPath("/api/phases"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Fase excluída");
      load();
    } catch (err: any) { setError(err.message); }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  const grouped = items.reduce<Record<string, Phase[]>>((acc, p) => { (acc[p.projectName] ??= []).push(p); return acc; }, {});

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Fases do Projeto" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><GitBranch size={24} className="text-[#0c4a3e]" /> Fases do Projeto</h1>
          <p className="text-sm text-gray-500 mt-1">Defina as etapas de cada projeto</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Nova fase
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-8 text-center text-gray-400">Nenhuma fase cadastrada</div>
      ) : Object.entries(grouped).map(([proj, phases]) => (
        <div key={proj} className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b font-medium text-gray-700 text-sm">{proj}</div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {phases.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{item.description || "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-500 w-20">{item.sequence}</td>
                  <td className="px-4 py-3 text-center w-20">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {item.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-16">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-[#0c4a3e]"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(item)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar Fase" : "Nova Fase"}>
        <form onSubmit={handleSubmit}>
          {!editing && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Ref. do projeto" required><input value={projectRef} onChange={(e) => setProjectRef(e.target.value)} className={inputClass} required /></FormField>
              <FormField label="Nome do projeto" required><input value={projectName} onChange={(e) => setProjectName(e.target.value)} className={inputClass} required /></FormField>
            </div>
          )}
          <FormField label="Nome da fase" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
          <FormField label="Descrição"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Sequência"><input type="number" value={sequence} onChange={(e) => setSequence(e.target.value)} className={inputClass} /></FormField>
            {editing && (
              <FormField label="Ativo">
                <label className="flex items-center gap-2 mt-1 text-sm cursor-pointer">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-gray-300 text-[#0c4a3e] focus:ring-[#0c4a3e]" /> {active ? "Sim" : "Não"}
                </label>
              </FormField>
            )}
          </div>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label={editing ? "Salvar" : "Criar"} />
        </form>
      </FormDialog>
    </div>
  );
}
