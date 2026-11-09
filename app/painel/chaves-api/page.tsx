"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Trash2, Key, Copy, Eye, EyeOff } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass } from "../components/form-dialog";
import { useToast } from "../components/toast";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

type ApiKeyItem = { id: number; name: string; keyPrefix: string; scopes: string[]; expiresAt: string | null; lastUsedAt: string | null; revoked: boolean; createdAt: string };

const SCOPES = ["read", "write", "admin"];

export default function ChavesApiPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [newKey, setNewKey] = useState<string | null>(null);

  function load() {
    fetch(appPath("/api/api-keys"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.keys ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew() { setName(""); setScopes(["read"]); setExpiresInDays("90"); setNewKey(null); setFormOpen(true); }

  function toggleScope(s: string) { setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(appPath("/api/api-keys"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes, expiresInDays: parseInt(expiresInDays) || 90 }),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      setNewKey(b.key ?? null);
      toast("Chave de API criada");
      load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleRevoke(item: ApiKeyItem) {
    if (!confirm(`Revogar chave "${item.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const r = await fetch(appPath("/api/api-keys"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Chave revogada");
      load();
    } catch (err: any) { setError(err.message); }
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  }

  const akColumns: ColumnDef<ApiKeyItem>[] = [
    { key: "name", label: "Nome", sortable: true, getValue: (k) => k.name },
    { key: "keyPrefix", label: "Prefixo", sortable: true, getValue: (k) => k.keyPrefix },
    { key: "scopes", label: "Escopos", sortable: false, className: "hidden sm:table-cell" },
    { key: "expiresAt", label: "Expira", sortable: true, className: "text-center hidden md:table-cell", getValue: (k) => k.expiresAt ?? "" },
    { key: "lastUsedAt", label: "Último uso", sortable: true, className: "text-center hidden md:table-cell", getValue: (k) => k.lastUsedAt ? new Date(k.lastUsedAt).getTime() : 0 },
    { key: "revoked", label: "Status", sortable: true, filterable: true, filterOptions: ["Ativa", "Revogada"], className: "text-center", getValue: (k) => k.revoked ? "Revogada" : "Ativa" },
  ];
  const { toggleSort, setFilter: setColFilter, getSortDir, filters: colFilters, sortAndFilter } = useSortableTable<ApiKeyItem>(items);
  const sorted = sortAndFilter(items, akColumns);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Chaves de API" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Key size={24} className="text-[#0c4a3e]" /> Chaves de API</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie tokens de acesso à API do sistema</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Nova chave
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            {akColumns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortDir={getSortDir(col.key)} onSort={() => toggleSort(col.key)}
                sortable={col.sortable} filterable={col.filterable} filterOptions={col.filterOptions}
                filterValue={colFilters[col.key] ?? ""} onFilter={(v) => setColFilter(col.key, v)} className={col.className ?? ""} />
            ))}
            <th className="w-12"></th>
          </tr></thead>
          <tbody className="divide-y">
            {sorted.map((item) => (
              <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.revoked ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.keyPrefix}...</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="flex gap-1">{item.scopes.map(s => <span key={s} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{s}</span>)}</div>
                </td>
                <td className="px-4 py-3 text-center text-gray-500 text-xs hidden md:table-cell">{formatDate(item.expiresAt)}</td>
                <td className="px-4 py-3 text-center text-gray-500 text-xs hidden md:table-cell">{formatDate(item.lastUsedAt)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.revoked ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                    {item.revoked ? "Revogada" : "Ativa"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {!item.revoked && <button onClick={() => handleRevoke(item)} className="text-gray-400 hover:text-red-500" title="Revogar"><Trash2 size={15} /></button>}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhuma chave de API cadastrada</td></tr>}
          </tbody>
        </table>
      </div>

      <FormDialog open={formOpen} onClose={() => { setFormOpen(false); setNewKey(null); }} title={newKey ? "Chave Criada" : "Nova Chave de API"}>
        {newKey ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium">Copie esta chave agora. Ela não será exibida novamente.</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-3">
              <code className="flex-1 text-sm font-mono break-all">{newKey}</code>
              <button onClick={() => { navigator.clipboard.writeText(newKey); toast("Chave copiada"); }} className="text-gray-400 hover:text-[#0c4a3e] shrink-0"><Copy size={16} /></button>
            </div>
            <button onClick={() => { setFormOpen(false); setNewKey(null); }} className="w-full py-2 text-sm font-medium text-white bg-[#0c4a3e] rounded-lg hover:bg-[#0a3d33]">Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormField label="Nome" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="ex: Integração ERP" required /></FormField>
            <FormField label="Escopos">
              <div className="flex gap-3">
                {SCOPES.map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} className="rounded border-gray-300 text-[#0c4a3e] focus:ring-[#0c4a3e]" />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Expira em (dias)"><input type="number" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} className={inputClass} /></FormField>
            <FormActions onCancel={() => setFormOpen(false)} loading={saving} label="Criar" />
          </form>
        )}
      </FormDialog>
    </div>
  );
}
