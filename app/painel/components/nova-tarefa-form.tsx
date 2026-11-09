"use client";

import { useState, useEffect, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "./form-dialog";

type ProjectOption = { id: number; name: string };

export default function NovaTarefaForm({
  open, onClose, onCreated, defaultProjectId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaultProjectId?: number | null;
}) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"task" | "milestone" | "subtask">("task");
  const [status, setStatus] = useState("A fazer");
  const [assignedName, setAssignedName] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [plannedHours, setPlannedHours] = useState("");
  const [priority, setPriority] = useState("Média");

  useEffect(() => {
    if (!open) return;
    fetch(appPath("/api/projects"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { projects?: ProjectOption[] };
        setProjects(body.projects ?? []);
        if (defaultProjectId) setProjectId(String(defaultProjectId));
        else if (!projectId && (body.projects ?? []).length > 0) setProjectId(String(body.projects![0].id));
      })
      .catch(() => {});
  }, [open]);

  function reset() {
    setProjectId(defaultProjectId ? String(defaultProjectId) : "");
    setName(""); setKind("task"); setStatus("A fazer"); setAssignedName("");
    setPlannedStart(""); setPlannedEnd(""); setPlannedHours(""); setPriority("Média"); setError("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(appPath("/api/project-items"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectId), name, kind, status,
          assignedName: assignedName || undefined,
          plannedStart: plannedStart || undefined,
          plannedEnd: plannedEnd || undefined,
          plannedHours: plannedHours ? Number(plannedHours) : undefined,
          priority,
        }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao criar tarefa");
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
    <FormDialog open={open} onClose={handleClose} title="Nova Tarefa">
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <FormField label="Projeto" required>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectClass} required>
            <option value="">Selecione...</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>

        <FormField label="Título" required>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo">
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={selectClass}>
              <option value="task">Tarefa</option>
              <option value="milestone">Marco</option>
              <option value="subtask">Subtarefa</option>
            </select>
          </FormField>
          <FormField label="Prioridade">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </FormField>
        </div>

        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="A fazer">A fazer</option>
            <option value="Em progresso">Em progresso</option>
            <option value="Bloqueada">Bloqueada</option>
            <option value="Em revisão">Em revisão</option>
            <option value="Concluída">Concluída</option>
          </select>
        </FormField>

        <FormField label="Responsável">
          <input value={assignedName} onChange={(e) => setAssignedName(e.target.value)} className={inputClass} placeholder="Nome do responsável" />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Início planejado">
            <input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Término planejado">
            <input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Horas planejadas">
          <input type="number" min={0} value={plannedHours} onChange={(e) => setPlannedHours(e.target.value)} className={inputClass} />
        </FormField>

        <FormActions onCancel={handleClose} loading={loading} />
      </form>
    </FormDialog>
  );
}
