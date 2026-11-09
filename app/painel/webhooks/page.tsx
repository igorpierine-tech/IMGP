"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Pencil, Trash2, Webhook, ExternalLink } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass } from "../components/form-dialog";
import { useToast } from "../components/toast";
import { SortableHeader, useSortableTable, type ColumnDef } from "../components/sortable-header";

type WebhookItem = { id: number; name: string; url: string; secret: string; eventsJson: string; active: boolean; lastTriggeredAt: string | null; failureCount: number };

const AVAILABLE_EVENTS = [
  "project.created", "project.updated", "project.completed",
  "task.created", "task.status_changed", "task.assigned",
  "demand.created", "demand.stage_changed", "demand.approved",
  "comment.created",
];

export default function WebhooksPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  function load() {
    fetch(appPath("/api/webhooks"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.webhooks ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const [editing, setEditing] = useState<WebhookItem | null>(null);

  function openNew() { setEditing(null); setName(""); setUrl(""); setEvents([]); setFormOpen(true); }

  function openEdit(item: WebhookItem) {
    setEditing(item); setName(item.name); setUrl(item.url);
    setEvents(parseEvents(item.eventsJson)); setFormOpen(true);
  }

  function toggleEvent(ev: string) { setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const payload = editing
        ? { id: editing.id, name: name.trim(), url: url.trim(), events }
        : { name: name.trim(), url: url.trim(), events };
      const r = await fetch(appPath("/api/webhooks"), {
        method: editing ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast(editing ? "Webhook atualizado" : "Webhook criado");
      setFormOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: WebhookItem) {
    if (!confirm(`Excluir webhook "${item.name}"?`)) return;
    try {
      const r = await fetch(appPath("/api/webhooks"), {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }),
      });
      if (!r.ok) { const b = await r.json() as any; throw new Error(b.error ?? "Erro"); }
      toast("Webhook excluído");
      load();
    } catch (err: any) { setError(err.message); }
  }

  function parseEvents(json: string): string[] {
    try { return JSON.parse(json); } catch { return []; }
  }

  const whColumns: ColumnDef<WebhookItem>[] = [
    { key: "name", label: "Nome", sortable: true, getValue: (w) => w.name },
    { key: "url", label: "URL", sortable: true, className: "hidden sm:table-cell", getValue: (w) => w.url },
    { key: "events", label: "Eventos", sortable: true, className: "text-center", getValue: (w) => parseEvents(w.eventsJson).length },
    { key: "failures", label: "Falhas", sortable: true, className: "text-center", getValue: (w) => w.failureCount },
    { key: "active", label: "Status", sortable: true, filterable: true, filterOptions: ["Ativo", "Inativo"], className: "text-center", getValue: (w) => w.active ? "Ativo" : "Inativo" },
  ];
  const { toggleSort, setFilter: setColFilter, getSortDir, filters: colFilters, sortAndFilter } = useSortableTable<WebhookItem>(items);
  const sorted = sortAndFilter(items, whColumns);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Webhooks" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Webhook size={24} className="text-[#0c4a3e]" /> Webhooks</h1>
          <p className="text-sm text-gray-500 mt-1">Configure integrações externas via webhooks</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Novo webhook
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            {whColumns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortDir={getSortDir(col.key)} onSort={() => toggleSort(col.key)}
                sortable={col.sortable} filterable={col.filterable} filterOptions={col.filterOptions}
                filterValue={colFilters[col.key] ?? ""} onFilter={(v) => setColFilter(col.key, v)} className={col.className ?? ""} />
            ))}
            <th className="w-12"></th>
          </tr></thead>
          <tbody className="divide-y">
            {sorted.map((item) => {
              const evts = parseEvents(item.eventsJson);
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1 text-gray-500 font-mono text-xs truncate max-w-xs">
                      {item.url} <ExternalLink size={12} className="shrink-0" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{evts.length}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={item.failureCount > 0 ? "text-red-500 font-medium" : "text-gray-400"}>{item.failureCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {item.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-[#0c4a3e]"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(item)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum webhook cadastrado</td></tr>}
          </tbody>
        </table>
      </div>

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar Webhook" : "Novo Webhook"}>
        <form onSubmit={handleSubmit}>
          <FormField label="Nome" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
          <FormField label="URL" required><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} placeholder="https://..." required /></FormField>
          <FormField label="Eventos">
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {AVAILABLE_EVENTS.map(ev => (
                <label key={ev} className="flex items-center gap-2 text-xs cursor-pointer px-1.5 py-1 rounded hover:bg-gray-100">
                  <input type="checkbox" checked={events.includes(ev)} onChange={() => toggleEvent(ev)} className="rounded border-gray-300 text-[#0c4a3e] focus:ring-[#0c4a3e] w-3 h-3" />
                  {ev}
                </label>
              ))}
            </div>
          </FormField>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label={editing ? "Salvar" : "Criar"} />
        </form>
      </FormDialog>
    </div>
  );
}
