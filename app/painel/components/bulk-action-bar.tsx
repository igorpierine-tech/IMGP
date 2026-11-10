"use client";

import { useState } from "react";
import { appPath } from "@/lib/app-path";
import { Trash2, RefreshCw, X } from "lucide-react";
import { useMembers } from "./user-select";

type BulkActionBarProps = {
  selectedIds: number[];
  onClear: () => void;
  onDone: () => void;
  toast: (msg: string, type?: string) => void;
  statusOptions?: { value: string; label: string }[];
};

const DEFAULT_STATUS_OPTIONS = [
  { value: "planned", label: "A fazer" },
  { value: "in_progress", label: "Em andamento" },
  { value: "blocked", label: "Bloqueada" },
  { value: "review", label: "Em revisão" },
  { value: "done", label: "Concluída" },
];

export default function BulkActionBar({ selectedIds, onClear, onDone, toast, statusOptions }: BulkActionBarProps) {
  const [loading, setLoading] = useState(false);
  const opts = statusOptions ?? DEFAULT_STATUS_OPTIONS;
  const members = useMembers();

  async function bulkAction(action: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    try {
      const r = await fetch(appPath("/api/bulk"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemIds: selectedIds, ...extra }),
      });
      const b = await r.json() as { error?: string; updated?: number; deleted?: number };
      if (!r.ok) throw new Error(b.error ?? "Erro na operação em massa");
      const count = b.updated ?? b.deleted ?? 0;
      toast(`${count} ${count === 1 ? "item atualizado" : "itens atualizados"}`);
      onClear();
      onDone();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir ${selectedIds.length} ${selectedIds.length === 1 ? "item" : "itens"} permanentemente?`)) return;
    await bulkAction("delete");
  }

  async function handleStatusChange(status: string) {
    await bulkAction("update_status", { status });
  }

  async function handleAssignee(name: string) {
    await bulkAction("update_assignee", { assignedName: name === "__remove__" ? null : name });
  }

  if (selectedIds.length === 0) return null;

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 bg-[#0c4a3e] text-white rounded-lg px-4 py-2.5 shadow-lg animate-in fade-in slide-in-from-top-2">
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedIds.length} {selectedIds.length === 1 ? "selecionado" : "selecionados"}
      </span>
      <div className="h-5 w-px bg-white/20" />
      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          disabled={loading}
          defaultValue=""
          onChange={(e) => { if (e.target.value) handleStatusChange(e.target.value); e.target.value = ""; }}
          className="text-xs bg-white/15 border border-white/20 text-white rounded-md px-2 py-1.5 outline-none hover:bg-white/25 transition-colors cursor-pointer disabled:opacity-50"
        >
          <option value="" disabled>Alterar status...</option>
          {opts.map((s) => <option key={s.value} value={s.value} className="text-gray-900">{s.label}</option>)}
        </select>
        <select
          disabled={loading}
          defaultValue=""
          onChange={(e) => { if (e.target.value) handleAssignee(e.target.value); e.target.value = ""; }}
          className="text-xs bg-white/15 border border-white/20 text-white rounded-md px-2 py-1.5 outline-none hover:bg-white/25 transition-colors cursor-pointer disabled:opacity-50"
        >
          <option value="" disabled>Responsável...</option>
          <option value="__remove__" className="text-gray-900">Remover responsável</option>
          {members.map((m) => <option key={m.id} value={m.displayName} className="text-gray-900">{m.displayName}</option>)}
        </select>
        <button onClick={handleDelete} disabled={loading}
          className="flex items-center gap-1 text-xs bg-red-500/80 border border-red-400/30 rounded-md px-2 py-1.5 hover:bg-red-500 transition-colors disabled:opacity-50">
          <Trash2 size={13} /> Excluir
        </button>
      </div>
      <div className="flex-1" />
      {loading && <RefreshCw size={14} className="animate-spin" />}
      <button onClick={onClear} className="p-1 rounded-md hover:bg-white/15 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}
