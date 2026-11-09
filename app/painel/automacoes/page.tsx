"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Zap, ToggleLeft, ToggleRight } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "../components/form-dialog";
import { useToast } from "../components/toast";

type Rule = { id: number; name: string; description: string | null; triggerEvent: string; triggerConditionsJson: any; actionType: string; actionConfigJson: any; active: boolean; executionCount: number; lastExecutedAt: string | null };

const TRIGGER_LABELS: Record<string, string> = {
  "task.status_changed": "Tarefa: status alterado",
  "task.assigned": "Tarefa: atribuída",
  "demand.stage_changed": "Demanda: etapa alterada",
  "demand.approved": "Demanda: aprovada",
  "project.created": "Projeto: criado",
  "project.completed": "Projeto: concluído",
  "comment.created": "Comentário: criado",
};

const ACTION_LABELS: Record<string, string> = {
  notify: "Enviar notificação",
  email: "Enviar e-mail",
  set_field: "Alterar campo",
  create_task: "Criar tarefa",
};

export default function AutomacoesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Rule[]>([]);
  const [validTriggers, setValidTriggers] = useState<string[]>([]);
  const [validActions, setValidActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [actionType, setActionType] = useState("");

  function load() {
    fetch(appPath("/api/automations"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.rules ?? []); setValidTriggers(b.validTriggers ?? []); setValidActions(b.validActions ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew() { setName(""); setDescription(""); setTriggerEvent(validTriggers[0] ?? ""); setActionType(validActions[0] ?? ""); setFormOpen(true); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !triggerEvent || !actionType) return;
    setSaving(true);
    try {
      const r = await fetch(appPath("/api/automations"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, triggerEvent, actionType, actionConfig: {} }),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast("Regra de automação criada");
      setFormOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function toggleActive(rule: Rule) {
    try {
      const r = await fetch(appPath("/api/automations"), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, active: !rule.active }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast(rule.active ? "Regra desativada" : "Regra ativada");
      load();
    } catch (err: any) { setError(err.message); }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Regras de Automação" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Zap size={24} className="text-[#0c4a3e]" /> Regras de Automação</h1>
          <p className="text-sm text-gray-500 mt-1">Automatize ações com base em eventos do sistema</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Nova regra
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Nome</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Gatilho</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Ação</th>
            <th className="text-center px-4 py-3 font-medium text-gray-500 w-24">Execuções</th>
            <th className="text-center px-4 py-3 font-medium text-gray-500 w-20">Status</th>
          </tr></thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.description && <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{TRIGGER_LABELS[item.triggerEvent] ?? item.triggerEvent}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">{ACTION_LABELS[item.actionType] ?? item.actionType}</span>
                </td>
                <td className="px-4 py-3 text-center text-gray-500">{item.executionCount}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(item)} className="inline-flex items-center" title={item.active ? "Desativar" : "Ativar"}>
                    {item.active ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} className="text-gray-300" />}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhuma regra de automação cadastrada</td></tr>}
          </tbody>
        </table>
      </div>

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title="Nova Regra de Automação">
        <form onSubmit={handleSubmit}>
          <FormField label="Nome" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
          <FormField label="Descrição"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Evento gatilho" required>
              <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className={selectClass}>
                {validTriggers.map(t => <option key={t} value={t}>{TRIGGER_LABELS[t] ?? t}</option>)}
              </select>
            </FormField>
            <FormField label="Tipo de ação" required>
              <select value={actionType} onChange={(e) => setActionType(e.target.value)} className={selectClass}>
                {validActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
              </select>
            </FormField>
          </div>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label="Criar" />
        </form>
      </FormDialog>
    </div>
  );
}
