"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, ChevronDown, ChevronRight, GitMerge } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "../components/form-dialog";
import { useToast } from "../components/toast";

type Chain = { id: number; name: string; entityType: string; stepsJson: string; escalationHours: number | null; active: boolean };

const ENTITY_TYPES = [
  { value: "project", label: "Projeto" },
  { value: "demand", label: "Demanda" },
  { value: "task", label: "Tarefa" },
];

export default function CadeiasAprovacaoPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("project");
  const [escalationHours, setEscalationHours] = useState("");
  const [steps, setSteps] = useState<Array<{ approverRole: string }>>([{ approverRole: "" }]);
  const [expanded, setExpanded] = useState<number | null>(null);

  function load() {
    fetch(appPath("/api/approval-chains?view=chains"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.chains ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew() { setName(""); setEntityType("project"); setEscalationHours(""); setSteps([{ approverRole: "" }]); setFormOpen(true); }

  function addStep() { setSteps(s => [...s, { approverRole: "" }]); }
  function removeStep(i: number) { setSteps(s => s.filter((_, idx) => idx !== i)); }
  function updateStep(i: number, role: string) { setSteps(s => s.map((step, idx) => idx === i ? { approverRole: role } : step)); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const validSteps = steps.filter(s => s.approverRole.trim());
    if (validSteps.length === 0) { setError("Adicione pelo menos uma etapa com papel aprovador."); return; }
    setSaving(true);
    try {
      const r = await fetch(appPath("/api/approval-chains"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_chain", name: name.trim(), entityType, steps: validSteps, escalationHours: parseInt(escalationHours) || null }),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast("Cadeia de aprovação criada");
      setFormOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  function parseSteps(json: string): Array<{ approverRole?: string; approverUserId?: string }> {
    try { return JSON.parse(json); } catch { return []; }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Cadeias de Aprovação" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><GitMerge size={24} className="text-[#0c4a3e]" /> Cadeias de Aprovação</h1>
          <p className="text-sm text-gray-500 mt-1">Configure fluxos de aprovação para projetos e demandas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Nova cadeia
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="space-y-3">
        {items.map((chain) => {
          const chainSteps = parseSteps(chain.stepsJson);
          return (
            <div key={chain.id} className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
              <button onClick={() => setExpanded(expanded === chain.id ? null : chain.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="text-left">
                  <div className="font-medium text-gray-900">{chain.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {ENTITY_TYPES.find(e => e.value === chain.entityType)?.label ?? chain.entityType} &middot; {chainSteps.length} etapa(s)
                    {chain.escalationHours && <span> &middot; Escalação: {chain.escalationHours}h</span>}
                  </div>
                </div>
                {expanded === chain.id ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </button>
              {expanded === chain.id && (
                <div className="border-t px-4 py-3 bg-gray-50/50">
                  <div className="space-y-2">
                    {chainSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-[#0c4a3e] text-white text-xs flex items-center justify-center font-medium">{i + 1}</span>
                        <span className="text-gray-700">{step.approverRole ?? step.approverUserId ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-8 text-center text-gray-400">Nenhuma cadeia de aprovação cadastrada</div>}
      </div>

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title="Nova Cadeia de Aprovação">
        <form onSubmit={handleSubmit}>
          <FormField label="Nome" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo de entidade" required>
              <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={selectClass}>
                {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Escalação (horas)"><input type="number" value={escalationHours} onChange={(e) => setEscalationHours(e.target.value)} className={inputClass} placeholder="ex: 48" /></FormField>
          </div>
          <FormField label="Etapas de aprovação">
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-medium shrink-0">{i + 1}</span>
                  <input value={step.approverRole} onChange={(e) => updateStep(i, e.target.value)} className={inputClass} placeholder="Papel aprovador (ex: it_director)" />
                  {steps.length > 1 && <button type="button" onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600 text-xs shrink-0">Remover</button>}
                </div>
              ))}
              <button type="button" onClick={addStep} className="text-xs text-[#0c4a3e] hover:underline">+ Adicionar etapa</button>
            </div>
          </FormField>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label="Criar" />
        </form>
      </FormDialog>
    </div>
  );
}
