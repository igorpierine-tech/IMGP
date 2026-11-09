"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Pencil, Trash2, TextCursorInput } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "../components/form-dialog";
import { useToast } from "../components/toast";

type FieldDef = { id: number; entityType: string; fieldKey: string; label: string; fieldType: string; optionsJson: any; required: boolean; sequence: number; active: boolean };

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção" },
  { value: "multiselect", label: "Seleção múltipla" },
  { value: "boolean", label: "Sim/Não" },
  { value: "url", label: "URL" },
];

const ENTITY_TYPES = [
  { value: "project", label: "Projeto" },
  { value: "task", label: "Tarefa" },
  { value: "demand", label: "Demanda" },
];

export default function CamposPersonalizadosPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entityType, setEntityType] = useState("project");
  const [fieldKey, setFieldKey] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [required, setRequired] = useState(false);
  const [sequence, setSequence] = useState("0");

  function load() {
    fetch(appPath("/api/custom-fields"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.definitions ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const [editing, setEditing] = useState<FieldDef | null>(null);

  function openNew() { setEditing(null); setEntityType("project"); setFieldKey(""); setLabel(""); setFieldType("text"); setRequired(false); setSequence("0"); setFormOpen(true); }

  function openEdit(item: FieldDef) {
    setEditing(item); setEntityType(item.entityType); setFieldKey(item.fieldKey);
    setLabel(item.label); setFieldType(item.fieldType); setRequired(item.required);
    setSequence(String(item.sequence)); setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !fieldKey.trim()) return;
    setSaving(true);
    try {
      const payload = editing
        ? { id: editing.id, label: label.trim(), fieldType, required, sequence: parseInt(sequence) || 0 }
        : { action: "create_definition", entityType, fieldKey: fieldKey.trim(), label: label.trim(), fieldType, required, sequence: parseInt(sequence) || 0 };
      const r = await fetch(appPath("/api/custom-fields"), {
        method: editing ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast(editing ? "Campo atualizado" : "Campo personalizado criado");
      setFormOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: FieldDef) {
    if (!confirm(`Desativar campo "${item.label}"?`)) return;
    try {
      const r = await fetch(appPath("/api/custom-fields"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Campo desativado");
      load();
    } catch (err: any) { setError(err.message); }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  const grouped = items.reduce<Record<string, FieldDef[]>>((acc, f) => { (acc[f.entityType] ??= []).push(f); return acc; }, {});

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Campos Personalizados" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><TextCursorInput size={24} className="text-[#0c4a3e]" /> Campos Personalizados</h1>
          <p className="text-sm text-gray-500 mt-1">Adicione campos extras a projetos, tarefas e demandas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Novo campo
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-8 text-center text-gray-400">Nenhum campo personalizado cadastrado</div>
      ) : Object.entries(grouped).map(([etype, fields]) => (
        <div key={etype} className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b font-medium text-gray-700 text-sm capitalize">{ENTITY_TYPES.find(e => e.value === etype)?.label ?? etype}</div>
          <table className="w-full text-sm">
            <thead className="border-b"><tr>
              <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Chave</th>
              <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Label</th>
              <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Tipo</th>
              <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Obrigatório</th>
              <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Status</th>
              <th className="w-16"></th>
            </tr></thead>
            <tbody className="divide-y">
              {fields.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.fieldKey}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{item.fieldType}</span></td>
                  <td className="px-4 py-3 text-center text-gray-500">{item.required ? "Sim" : "Não"}</td>
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
            </tbody>
          </table>
        </div>
      ))}

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar Campo" : "Novo Campo Personalizado"}>
        <form onSubmit={handleSubmit}>
          {!editing && (
            <FormField label="Entidade" required>
              <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={selectClass}>
                {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Chave (field_key)" required><input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} className={inputClass} placeholder="ex: custom_priority" required disabled={!!editing} /></FormField>
            <FormField label="Label" required><input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="ex: Prioridade customizada" required /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Tipo">
              <select value={fieldType} onChange={(e) => setFieldType(e.target.value)} className={selectClass}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Sequência"><input type="number" value={sequence} onChange={(e) => setSequence(e.target.value)} className={inputClass} /></FormField>
            <FormField label="Obrigatório">
              <label className="flex items-center gap-2 mt-1 text-sm cursor-pointer">
                <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded border-gray-300 text-[#0c4a3e] focus:ring-[#0c4a3e]" /> {required ? "Sim" : "Não"}
              </label>
            </FormField>
          </div>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label={editing ? "Salvar" : "Criar"} />
        </form>
      </FormDialog>
    </div>
  );
}
