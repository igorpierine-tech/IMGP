"use client";

import { useState, useEffect } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "./form-dialog";

type Task = {
  id: number; name: string; kind: string; status: string; health: string;
  assignedName?: string; plannedStart?: string; plannedEnd?: string; plannedHours: number;
  rawJson?: string; parentId?: number | null; sprintId?: number | null; projectId?: number;
};
type EpicOption = { id: number; name: string };
type SprintOption = { id: number; name: string };

const ptToEn: Record<string, string> = {
  "A fazer": "planned", "Em progresso": "in_progress", "Bloqueada": "blocked",
  "Em revisão": "review", "Concluída": "done",
};

export default function EditTarefaForm({ task, onClose, onSaved }: { task: Task; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(task.name);
  const [status, setStatus] = useState(ptToEn[task.status] ?? task.status);
  const [parentId, setParentId] = useState(task.parentId ? String(task.parentId) : "");
  const [sprintId, setSprintId] = useState(task.sprintId ? String(task.sprintId) : "");
  const [epics, setEpics] = useState<EpicOption[]>([]);
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [assignedName, setAssignedName] = useState(task.assignedName ?? "");
  const [plannedEnd, setPlannedEnd] = useState(task.plannedEnd ?? "");
  const [plannedHours, setPlannedHours] = useState(task.plannedHours);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!task.projectId) return;
    fetch(appPath(`/api/epics?projectId=${task.projectId}`), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setEpics(b.epics ?? []); })
      .catch(() => {});
    fetch(appPath(`/api/sprints?projectId=${task.projectId}`), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setSprints(b.sprints ?? []); })
      .catch(() => {});
  }, [task.projectId]);

  let priority = "Média";
  try { if (task.rawJson) priority = JSON.parse(task.rawJson).priority ?? "Média"; } catch {}
  const [pri, setPri] = useState(priority);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch(appPath("/api/project-items"), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, name: name.trim(), status, parentId: parentId ? Number(parentId) : null, sprintId: sprintId ? Number(sprintId) : null, assignedName: assignedName.trim() || null, plannedEnd: plannedEnd || null, plannedHours, priority: pri }),
      });
      if (!r.ok) { const b = await r.json() as { error?: string }; throw new Error(b.error ?? "Erro"); }
      onSaved();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <FormDialog open title="Editar Tarefa" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        <FormField label="Nome *"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Épico">
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={selectClass}>
              <option value="">Nenhum (avulsa)</option>
              {epics.map((ep) => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
            </select>
          </FormField>
          <FormField label="Sprint">
            <select value={sprintId} onChange={(e) => setSprintId(e.target.value)} className={selectClass}>
              <option value="">Nenhuma</option>
              {sprints.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="planned">A fazer</option><option value="in_progress">Em progresso</option><option value="blocked">Bloqueada</option>
              <option value="review">Em revisão</option><option value="done">Concluída</option>
            </select>
          </FormField>
          <FormField label="Prioridade">
            <select value={pri} onChange={(e) => setPri(e.target.value)} className={selectClass}>
              <option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option>
            </select>
          </FormField>
        </div>
        <FormField label="Responsável"><input value={assignedName} onChange={(e) => setAssignedName(e.target.value)} className={inputClass} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Prazo"><input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} className={inputClass} /></FormField>
          <FormField label="Horas planejadas"><input type="number" min={0} value={plannedHours} onChange={(e) => setPlannedHours(Number(e.target.value))} className={inputClass} /></FormField>
        </div>
        <FormActions onClose={onClose} saving={saving} label="Salvar" />
      </form>
    </FormDialog>
  );
}
