"use client";

import { useState, useEffect, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "./form-dialog";

type ProjectOption = { id: number; name: string; source?: string; externalId?: string };
type PhaseOption = { id: number; name: string; projectRef: string };

export default function NovoSprintForm({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [phases, setPhases] = useState<PhaseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [projectId, setProjectId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [status, setStatus] = useState("Planejada");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch(appPath("/api/projects"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { projects?: ProjectOption[] };
        setProjects(body.projects ?? []);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!projectId) { setPhases([]); return; }
    const proj = projects.find((p) => p.id === Number(projectId));
    if (!proj) return;
    const ref = proj.source === "external" ? `external:${proj.externalId}` : `platform:${proj.id}`;
    fetch(appPath(`/api/phases?projectRef=${encodeURIComponent(ref)}`), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { phases?: PhaseOption[] };
        setPhases(body.phases ?? []);
      })
      .catch(() => {});
  }, [projectId, projects]);

  function reset() {
    setProjectId(""); setPhaseId(""); setName(""); setObjective("");
    setStatus("Planejada"); setStartDate(""); setEndDate(""); setError("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(appPath("/api/sprints"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectId), phaseId: Number(phaseId), name,
          objective: objective || undefined, status,
          startDate: startDate || undefined, endDate: endDate || undefined,
        }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao criar sprint");
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
    <FormDialog open={open} onClose={handleClose} title="Nova Sprint">
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <FormField label="Projeto" required>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectClass} required>
            <option value="">Selecione...</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>

        <FormField label="Fase" required>
          <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className={selectClass} required>
            <option value="">Selecione...</option>
            {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {projectId && phases.length === 0 && <p className="text-xs text-amber-600 mt-1">Nenhuma fase cadastrada para este projeto.</p>}
        </FormField>

        <FormField label="Nome da sprint" required>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required placeholder="Ex: Sprint 1" />
        </FormField>

        <FormField label="Objetivo">
          <textarea value={objective} onChange={(e) => setObjective(e.target.value)} className={inputClass} rows={2} />
        </FormField>

        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="Planejada">Planejada</option>
            <option value="Ativa">Ativa</option>
            <option value="Concluída">Concluída</option>
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Início">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Término">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormActions onCancel={handleClose} loading={loading} />
      </form>
    </FormDialog>
  );
}
