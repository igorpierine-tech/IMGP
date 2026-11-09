"use client";

import { useState, useEffect } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "./form-dialog";

type Project = {
  id: number; name: string; code?: string; area?: string; managerName?: string;
  status: string; health: string; progress: number; plannedHours: number;
  plannedCost: number; actualCost: number; plannedStart?: string; plannedEnd?: string;
  projectTypeId?: number; projectPrioritized?: boolean;
};

type ProjectType = { id: number; name: string; active: boolean };

export default function EditProjectForm({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(project.name);
  const [code, setCode] = useState(project.code ?? "");
  const [area, setArea] = useState(project.area ?? "");
  const [managerName, setManagerName] = useState(project.managerName ?? "");
  const [status, setStatus] = useState(project.status);
  const [plannedStart, setPlannedStart] = useState(project.plannedStart ?? "");
  const [plannedEnd, setPlannedEnd] = useState(project.plannedEnd ?? "");
  const [plannedHours, setPlannedHours] = useState(project.plannedHours);
  const [plannedCost, setPlannedCost] = useState(project.plannedCost);
  const [projectTypeId, setProjectTypeId] = useState(project.projectTypeId ?? 0);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(appPath("/api/project-types"), { credentials: "include" })
      .then((r) => r.json() as Promise<{ projectTypes: ProjectType[] }>)
      .then((res) => setProjectTypes((res.projectTypes ?? []).filter((t) => t.active)));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const r = await fetch(appPath("/api/projects"), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, projectTypeId }),
      });
      if (!r.ok) { const b = await r.json() as { error?: string }; throw new Error(b.error ?? "Erro"); }
      onSaved();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <FormDialog open title="Editar Projeto" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        <FormField label="Nome"><input value={name} readOnly className={`${inputClass} bg-gray-50`} /></FormField>
        <FormField label="Tipo do projeto">
          <select value={projectTypeId} onChange={(e) => setProjectTypeId(Number(e.target.value))} className={selectClass}>
            <option value={0}>Selecione</option>
            {projectTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <select value={status} disabled className={`${selectClass} bg-gray-50`}>
              <option value="planning">Planejamento</option><option value="active">Ativo</option>
              <option value="on_hold">Pausado</option><option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </FormField>
          <FormField label="Código"><input value={code} readOnly className={`${inputClass} bg-gray-50`} /></FormField>
        </div>
        <FormActions onClose={onClose} saving={saving} label="Salvar" />
      </form>
    </FormDialog>
  );
}
