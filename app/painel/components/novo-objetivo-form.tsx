"use client";

import { useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "./form-dialog";

export default function NovoObjetivoForm({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState("");

  function reset() { setTitle(""); setDescription(""); setPeriod(""); setError(""); }
  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(appPath("/api/okrs"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_objective",
          title,
          description: description || undefined,
          period: period || undefined,
        }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao criar objetivo");
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
    <FormDialog open={open} onClose={handleClose} title="Novo Objetivo (OKR)">
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <FormField label="Título do objetivo" required>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required
            placeholder="Ex: Aumentar a satisfação do cliente" />
        </FormField>

        <FormField label="Descrição">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={3} />
        </FormField>

        <FormField label="Período">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectClass}>
            <option value="">Selecione...</option>
            <option value="Q1 2025">Q1 2025</option>
            <option value="Q2 2025">Q2 2025</option>
            <option value="Q3 2025">Q3 2025</option>
            <option value="Q4 2025">Q4 2025</option>
            <option value="H1 2025">H1 2025</option>
            <option value="H2 2025">H2 2025</option>
            <option value="2025">Anual 2025</option>
          </select>
        </FormField>

        <FormActions onCancel={handleClose} loading={loading} />
      </form>
    </FormDialog>
  );
}

export function NovoKeyResultForm({
  open, onClose, onCreated, objectiveId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  objectiveId: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [metricType, setMetricType] = useState("percentage");
  const [targetValue, setTargetValue] = useState("100");
  const [unit, setUnit] = useState("");

  function reset() { setTitle(""); setMetricType("percentage"); setTargetValue("100"); setUnit(""); setError(""); }
  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(appPath("/api/okrs"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_key_result",
          objectiveId,
          title,
          metricType,
          targetValue: Number(targetValue),
          unit: unit || undefined,
        }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao criar key result");
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
    <FormDialog open={open} onClose={handleClose} title="Novo Key Result">
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <FormField label="Título" required>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required
            placeholder="Ex: NPS acima de 80" />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo de métrica">
            <select value={metricType} onChange={(e) => setMetricType(e.target.value)} className={selectClass}>
              <option value="percentage">Percentual</option>
              <option value="number">Número</option>
              <option value="currency">Valor (R$)</option>
              <option value="boolean">Sim/Não</option>
            </select>
          </FormField>
          <FormField label="Meta">
            <input type="number" min={0} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Unidade">
          <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} placeholder="Ex: %, pontos, R$..." />
        </FormField>

        <FormActions onCancel={handleClose} loading={loading} />
      </form>
    </FormDialog>
  );
}
