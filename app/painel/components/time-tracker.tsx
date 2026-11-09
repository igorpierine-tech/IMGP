"use client";

import { useState, useEffect, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "./form-dialog";
import { Play, Square } from "lucide-react";

type ProjectOption = { id: number; name: string };
type TaskOption = { id: number; name: string; projectId: number };
type RunningEntry = { id: number; activity: string; startedAt: string; itemId: number };

export function TimeTrackerButton() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState<RunningEntry | null>(null);

  useEffect(() => {
    fetch(appPath("/api/time-entries"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { entries?: RunningEntry[] };
        const active = (body.entries ?? []).find((e: any) => e.status === "running");
        if (active) setRunning(active);
      })
      .catch(() => {});
  }, []);

  async function stopTimer() {
    if (!running) return;
    try {
      await fetch(appPath("/api/time-entries"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", itemId: running.itemId }),
      });
      setRunning(null);
    } catch {}
  }

  if (running) {
    return (
      <button onClick={stopTimer}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors">
        <Square size={14} className="fill-red-700" />
        <span>Parar: {running.activity}</span>
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#0c4a3e] bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors">
        <Play size={14} className="fill-[#0c4a3e]" />
        <span>Iniciar atividade</span>
      </button>
      <StartTimerForm open={open} onClose={() => setOpen(false)} onStarted={(entry) => { setRunning(entry); setOpen(false); }} />
    </>
  );
}

function StartTimerForm({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: (entry: RunningEntry) => void }) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [projectId, setProjectId] = useState("");
  const [itemId, setItemId] = useState("");
  const [activity, setActivity] = useState("");

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
    if (!projectId) { setTasks([]); return; }
    fetch(appPath(`/api/kanban?projectId=${projectId}`), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { columns?: Record<string, TaskOption[]> };
        const all = Object.values(body.columns ?? {}).flat();
        setTasks(all);
      })
      .catch(() => {});
  }, [projectId]);

  function reset() { setProjectId(""); setItemId(""); setActivity(""); setError(""); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(appPath("/api/time-entries"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", itemId: Number(itemId), activity: activity || undefined }),
      });
      const body = await res.json() as { entry?: RunningEntry; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao iniciar");
      reset();
      onStarted(body.entry!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormDialog open={open} onClose={() => { reset(); onClose(); }} title="Iniciar Atividade">
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <FormField label="Projeto" required>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectClass} required>
            <option value="">Selecione...</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>

        <FormField label="Tarefa" required>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={selectClass} required>
            <option value="">Selecione...</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </FormField>

        <FormField label="Descrição da atividade">
          <input value={activity} onChange={(e) => setActivity(e.target.value)} className={inputClass} placeholder="Opcional" />
        </FormField>

        <FormActions onCancel={() => { reset(); onClose(); }} loading={loading} label="Iniciar" />
      </form>
    </FormDialog>
  );
}
