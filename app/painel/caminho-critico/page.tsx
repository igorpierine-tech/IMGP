"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Route, ArrowRight } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";

type CriticalTask = { id: number; name: string; earlyStart: number; earlyFinish: number; lateStart: number; lateFinish: number; slack: number; critical: boolean };
type ProjectOption = { id: number; name: string };

export default function CaminhoCriticoPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [tasks, setTasks] = useState<CriticalTask[]>([]);
  const [criticalPath, setCriticalPath] = useState<Array<{ id: number; name: string }>>([]);
  const [projectDuration, setProjectDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(appPath("/api/projects"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; const list = b.projects ?? []; setProjects(list); if (list.length > 0) setSelectedProject(list[0].id); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    fetch(appPath(`/api/critical-path?projectId=${selectedProject}`), { credentials: "include" })
      .then(async (r) => {
        const b = await r.json() as any;
        if (!r.ok) throw new Error(b.error ?? "Erro");
        setTasks(b.tasks ?? []); setCriticalPath(b.criticalPath ?? []); setProjectDuration(b.projectDuration ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumbs items={[{ label: "Análise" }, { label: "Caminho Crítico" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Route size={24} className="text-[#0c4a3e]" /> Caminho Crítico</h1>
          <p className="text-sm text-gray-500 mt-1">Identifique as tarefas que determinam a duração do projeto</p>
        </div>
        {projects.length > 0 && (
          <select value={selectedProject ?? ""} onChange={(e) => setSelectedProject(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0c4a3e]/20">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4">
              <div className="text-sm text-gray-500">Duração do projeto</div>
              <div className="text-2xl font-bold text-gray-900">{projectDuration} dias</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4">
              <div className="text-sm text-gray-500">Tarefas críticas</div>
              <div className="text-2xl font-bold text-red-600">{criticalPath.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4">
              <div className="text-sm text-gray-500">Total de tarefas</div>
              <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
            </div>
          </div>

          {/* Critical path visualization */}
          {criticalPath.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-red-500 rounded-full" /> Sequência crítica
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {criticalPath.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">{t.name}</span>
                    {i < criticalPath.length - 1 && <ArrowRight size={16} className="text-red-300" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task table */}
          <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tarefa</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Início (cedo)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Fim (cedo)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Início (tarde)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Fim (tarde)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Folga</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 w-20">Crítica</th>
              </tr></thead>
              <tbody className="divide-y">
                {tasks.map((t) => (
                  <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${t.critical ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{t.earlyStart}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{t.earlyFinish}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{t.lateStart}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{t.lateFinish}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${t.slack === 0 ? "text-red-600" : "text-gray-500"}`}>{t.slack}d</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.critical && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Sim</span>}
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhuma tarefa encontrada</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
