"use client";

import { useState } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "./form-dialog";

type Task = {
  id: number; name: string; kind: string; status: string; health: string;
  assignedName?: string; plannedStart?: string; plannedEnd?: string; plannedHours: number;
  rawJson?: string;
};

export default function EditTarefaForm({ task, onClose, onSaved }: { task: Task; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(task.name);
  const [status, setStatus] = useState(task.status);
  const [assignedName, setAssignedName] = useState(task.assignedName ?? "");
  const [plannedEnd, setPlannedEnd] = useState(task.plannedEnd ?? "");
  const [plannedHours, setPlannedHours] = useState(task.plannedHours);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({ id: task.id, name: name.trim(), status, assignedName: assignedName.trim() || null, plannedEnd: plannedEnd || null, plannedHours, priority: pri }),
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
          <FormField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option>A fazer</option><option>Em progresso</option><option>Bloqueada</option>
              <option>Em revisão</option><option>Concluída</option>
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
