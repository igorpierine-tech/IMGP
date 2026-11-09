"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

type ApprovalRequest = { id: number; chainId: number; entityType: string; entityId: number; currentStep: number; status: string; requestedBy: string; createdAt: string };
type Chain = { id: number; name: string; entityType: string; stepsJson: string; active: boolean };

export default function AprovacoesPage() {
  const [tab, setTab] = useState<"pending" | "chains">("pending");
  const [pending, setPending] = useState<ApprovalRequest[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = tab === "pending" ? appPath("/api/approval-chains?view=pending") : appPath("/api/approval-chains?view=chains");
    fetch(url, { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { requests?: ApprovalRequest[]; chains?: Chain[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro");
        if (tab === "pending") setPending(body.requests ?? []);
        else setChains(body.chains ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  const statusIcon: Record<string, React.ReactNode> = {
    pending: <Clock size={14} className="text-amber-500" />,
    approved: <CheckCircle2 size={14} className="text-emerald-500" />,
    rejected: <XCircle size={14} className="text-red-500" />,
  };

  const statusLabel: Record<string, string> = { pending: "Pendente", approved: "Aprovada", rejected: "Rejeitada" };

  const apColumns: ColumnDef<ApprovalRequest>[] = [
    { key: "id", label: "ID", sortable: true, getValue: (r) => r.id },
    { key: "entityType", label: "Tipo", sortable: true, filterable: true, filterOptions: [...new Set(pending.map(r => r.entityType))].sort(), getValue: (r) => r.entityType },
    { key: "entityId", label: "Entidade", sortable: true, getValue: (r) => r.entityId },
    { key: "currentStep", label: "Etapa", sortable: true, getValue: (r) => r.currentStep },
    { key: "status", label: "Status", sortable: true, filterable: true, filterOptions: ["pending", "approved", "rejected"], getValue: (r) => r.status },
    { key: "createdAt", label: "Criado em", sortable: true, getValue: (r) => new Date(r.createdAt).getTime() },
  ];
  const { toggleSort, setFilter: setColFilter, getSortDir, filters: colFilters, sortAndFilter } = useSortableTable<ApprovalRequest>(pending);
  const sortedPending = sortAndFilter(pending, apColumns);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Aprovações" }]} />
      <div><h1 className="text-2xl font-bold text-gray-900">Aprovações</h1><p className="text-sm text-gray-500 mt-1">Fluxos de aprovação em cadeia</p></div>

      <div className="flex gap-2">
        <button onClick={() => setTab("pending")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "pending" ? "bg-[#0c4a3e] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>Pendentes</button>
        <button onClick={() => setTab("chains")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "chains" ? "bg-[#0c4a3e] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>Cadeias</button>
      </div>

      {loading && <div className="flex items-center justify-center h-48 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>}

      {!loading && !error && tab === "pending" && (
        <div className="bg-white rounded-xl border">
          {pending.length === 0 ? (
            <div className="p-12 text-center"><ShieldCheck size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-400">Nenhuma aprovação pendente.</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                {apColumns.map((col) => (
                  <SortableHeader key={col.key} label={col.label} sortDir={getSortDir(col.key)} onSort={() => toggleSort(col.key)}
                    sortable={col.sortable} filterable={col.filterable} filterOptions={col.filterOptions}
                    filterValue={colFilters[col.key] ?? ""} onFilter={(v) => setColFilter(col.key, v)} />
                ))}
              </tr></thead>
              <tbody>
                {sortedPending.map((req) => (
                  <tr key={req.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3 font-medium">#{req.id}</td>
                    <td className="p-3 text-gray-600">{req.entityType}</td>
                    <td className="p-3 text-gray-600">#{req.entityId}</td>
                    <td className="p-3 text-gray-600">Etapa {req.currentStep + 1}</td>
                    <td className="p-3"><span className="flex items-center gap-1">{statusIcon[req.status]}{statusLabel[req.status] ?? req.status}</span></td>
                    <td className="p-3 text-gray-400">{new Date(req.createdAt).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && !error && tab === "chains" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chains.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border p-12 text-center"><p className="text-sm text-gray-400">Nenhuma cadeia de aprovação configurada.</p></div>
          ) : chains.map((c) => {
            let steps: { approverUserId?: string; approverRole?: string }[] = [];
            try { steps = JSON.parse(c.stepsJson); } catch {}
            return (
              <div key={c.id} className="bg-white rounded-xl border p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{c.name}</h3>
                <div className="text-xs text-gray-500 mb-3">Tipo: {c.entityType} · {steps.length} etapa(s)</div>
                <div className="space-y-1">
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-medium">{i + 1}</span>
                      {s.approverRole ?? s.approverUserId ?? "Não definido"}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
