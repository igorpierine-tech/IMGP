"use client";

import { useState, useEffect, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "./form-dialog";
import { useFormValidation, FieldError } from "./form-validation";
import UserSelect from "./user-select";

type ProjectType = { id: number; name: string; active: boolean };

export default function NovoProjetoForm({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [projectTypeId, setProjectTypeId] = useState("");
  const [code, setCode] = useState("");
  const [area, setArea] = useState("");
  const [managerName, setManagerName] = useState("");
  const [status, setStatus] = useState("planning");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [plannedHours, setPlannedHours] = useState("");
  const [plannedCost, setPlannedCost] = useState("");
  const [prioritized, setPrioritized] = useState(false);
  const [prioritizationDate, setPrioritizationDate] = useState("");
  const [approvingDirector, setApprovingDirector] = useState("");

  const { errors: fieldErrors, validate, clearError, clearAll } = useFormValidation({
    name: { required: true, minLength: 3, message: "Nome deve ter no mínimo 3 caracteres" },
    projectTypeId: { required: true, message: "Selecione o tipo do projeto" },
  });

  useEffect(() => {
    if (!open) return;
    fetch(appPath("/api/project-types"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { projectTypes?: ProjectType[] };
        setTypes((body.projectTypes ?? []).filter((t) => t.active));
      })
      .catch(() => {});
  }, [open]);

  function reset() {
    setName(""); setProjectTypeId(""); setCode(""); setArea(""); setManagerName("");
    setStatus("planning"); setPlannedStart(""); setPlannedEnd(""); setPlannedHours("");
    setPlannedCost(""); setPrioritized(false); setPrioritizationDate(""); setApprovingDirector("");
    setError(""); clearAll();
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate({ name, projectTypeId })) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(appPath("/api/projects"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, projectTypeId: Number(projectTypeId),
          code: code || undefined, area: area || undefined,
          managerName: managerName || undefined, status,
          plannedStart: plannedStart || undefined, plannedEnd: plannedEnd || undefined,
          plannedHours: plannedHours ? Number(plannedHours) : undefined,
          plannedCost: plannedCost ? Number(plannedCost) : undefined,
          projectPrioritized: prioritized,
          prioritizationDate: prioritized ? prioritizationDate : undefined,
          approvingDirector: prioritized ? approvingDirector : undefined,
        }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao criar projeto");
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
    <FormDialog open={open} onClose={handleClose} title="Novo Projeto">
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <FormField label="Nome do projeto" required>
          <input value={name} onChange={(e) => { setName(e.target.value); clearError("name"); }}
            className={`${inputClass} ${fieldErrors.name ? "border-red-300 focus:ring-red-200" : ""}`} />
          <FieldError message={fieldErrors.name} />
        </FormField>

        <FormField label="Tipo do projeto" required>
          <select value={projectTypeId} onChange={(e) => { setProjectTypeId(e.target.value); clearError("projectTypeId"); }}
            className={`${selectClass} ${fieldErrors.projectTypeId ? "border-red-300 focus:ring-red-200" : ""}`}>
            <option value="">Selecione...</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <FieldError message={fieldErrors.projectTypeId} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Código">
            <input value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} placeholder="Ex: PRJ-001" />
          </FormField>
          <FormField label="Área">
            <input value={area} onChange={(e) => setArea(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Gerente responsável">
          <UserSelect value={managerName} onChange={setManagerName} className={selectClass} placeholder="Selecione o gerente" />
        </FormField>

        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="planning">Planejamento</option>
            <option value="active">Ativo</option>
            <option value="on_hold">Pausado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Início planejado">
            <input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Término planejado">
            <input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Horas planejadas">
            <input type="number" min={0} value={plannedHours} onChange={(e) => setPlannedHours(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Custo planejado (R$)">
            <input type="number" min={0} step={0.01} value={plannedCost} onChange={(e) => setPlannedCost(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={prioritized} onChange={(e) => setPrioritized(e.target.checked)}
              className="rounded border-gray-300 text-[#0c4a3e] focus:ring-[#0c4a3e]" />
            Projeto priorizado
          </label>
        </div>

        {prioritized && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Data da priorização" required>
              <input type="date" value={prioritizationDate} onChange={(e) => setPrioritizationDate(e.target.value)} className={inputClass} required />
            </FormField>
            <FormField label="Diretor aprovador" required>
              <input value={approvingDirector} onChange={(e) => setApprovingDirector(e.target.value)} className={inputClass} required />
            </FormField>
          </div>
        )}

        <FormActions onCancel={handleClose} loading={loading} />
      </form>
    </FormDialog>
  );
}
