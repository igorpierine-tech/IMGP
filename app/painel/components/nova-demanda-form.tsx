"use client";

import { useState, useEffect, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "./form-dialog";

type ProjectType = { id: number; name: string; active: boolean };

type DemandEdit = {
  id: number; name: string; area: string; objective: string;
  projectTypeId: number; impact: string; solution?: string | null;
  benefit?: string | null; risk?: string | null;
  estimatedCost?: number | null; estimatedHours?: number | null;
  stage?: string | null;
};

export default function NovaDemandaForm({ open, onClose, onCreated, editing }: { open: boolean; onClose: () => void; onCreated?: () => void; editing?: DemandEdit | null }) {
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [objective, setObjective] = useState("");
  const [projectTypeId, setProjectTypeId] = useState("");
  const [impact, setImpact] = useState("Médio");
  const [solution, setSolution] = useState("");
  const [benefit, setBenefit] = useState("");
  const [risk, setRisk] = useState("");
  const [cost, setCost] = useState("");
  const [hours, setHours] = useState("");
  const [stage, setStage] = useState("Triagem");

  useEffect(() => {
    if (!open) return;
    fetch(appPath("/api/project-types"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { projectTypes?: ProjectType[] };
        setTypes((body.projectTypes ?? []).filter((t) => t.active));
      })
      .catch(() => {});
    if (editing) {
      setName(editing.name); setArea(editing.area); setObjective(editing.objective);
      setProjectTypeId(String(editing.projectTypeId)); setImpact(editing.impact || "Médio");
      setSolution(editing.solution ?? ""); setBenefit(editing.benefit ?? "");
      setRisk(editing.risk ?? ""); setCost(editing.estimatedCost ? String(editing.estimatedCost) : "");
      setHours(editing.estimatedHours ? String(editing.estimatedHours) : "");
      setStage(editing.stage ?? "Triagem");
    } else {
      reset();
    }
  }, [open, editing]);

  function reset() {
    setName(""); setArea(""); setObjective(""); setProjectTypeId(""); setImpact("Médio");
    setSolution(""); setBenefit(""); setRisk(""); setCost(""); setHours(""); setStage("Triagem"); setError("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name, area, objective, projectTypeId: Number(projectTypeId),
        impact, solution: solution || undefined, benefit: benefit || undefined,
        risk: risk || undefined, cost: cost ? Number(cost) : undefined,
        hours: hours ? Number(hours) : undefined,
      };
      if (editing) { payload.id = editing.id; payload.stage = stage; }
      const res = await fetch(appPath("/api/demands"), {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? (editing ? "Erro ao atualizar demanda" : "Erro ao criar demanda"));
      reset();
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormDialog open={open} onClose={handleClose} title={editing ? "Editar Demanda" : "Nova Demanda"}>
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <FormField label="Título da demanda" required>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </FormField>

        <FormField label="Área solicitante" required>
          <input value={area} onChange={(e) => setArea(e.target.value)} className={inputClass} required placeholder="Ex: Financeiro, RH, TI..." />
        </FormField>

        <FormField label="Problema ou necessidade" required>
          <textarea value={objective} onChange={(e) => setObjective(e.target.value)} className={inputClass} rows={3} required
            placeholder="Descreva o problema ou necessidade que origina esta demanda" />
        </FormField>

        <FormField label="Tipo do projeto" required>
          <select value={projectTypeId} onChange={(e) => setProjectTypeId(e.target.value)} className={selectClass} required>
            <option value="">Selecione...</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </FormField>

        <FormField label="Impacto">
          <select value={impact} onChange={(e) => setImpact(e.target.value)} className={selectClass}>
            <option value="Baixo">Baixo</option>
            <option value="Médio">Médio</option>
            <option value="Alto">Alto</option>
          </select>
        </FormField>

        <FormField label="Solução proposta">
          <textarea value={solution} onChange={(e) => setSolution(e.target.value)} className={inputClass} rows={2} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Benefício esperado">
            <input value={benefit} onChange={(e) => setBenefit(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Riscos">
            <input value={risk} onChange={(e) => setRisk(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Custo estimado (R$)">
            <input type="number" min={0} step={0.01} value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Horas estimadas">
            <input type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        {editing && (
          <FormField label="Estágio">
            <select value={stage} onChange={(e) => setStage(e.target.value)} className={selectClass}>
              <option>Triagem</option><option>Em Análise</option><option>Aprovada</option><option>Rejeitada</option><option>Concluída</option>
            </select>
          </FormField>
        )}

        <FormActions onCancel={handleClose} loading={loading} label={editing ? "Salvar" : "Criar"} />
      </form>
    </FormDialog>
  );
}
