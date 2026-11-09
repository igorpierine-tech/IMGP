"use client";

import { useEffect, useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Plus, Pencil, ShieldCheck, ChevronDown, ChevronRight } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import FormDialog, { FormField, FormActions, inputClass } from "../components/form-dialog";
import { useToast } from "../components/toast";

type Role = { id: number; key: string; name: string; description: string | null; builtIn: boolean; active: boolean; permissions: string[] };

export default function PapeisPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Role[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  function load() {
    fetch(appPath("/api/roles"), { credentials: "include" })
      .then(async (r) => { const b = await r.json() as any; setItems(b.roles ?? []); setModules(b.availableModules ?? []); setActions(b.availableActions ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew() { setKey(""); setName(""); setDescription(""); setPerms([]); setFormOpen(true); }

  function togglePerm(p: string) { setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!key.trim() || !name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(appPath("/api/roles"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim(), name: name.trim(), description: description.trim() || null, permissions: perms }),
      });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro");
      toast("Papel criado");
      setFormOpen(false); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Cadastros" }, { label: "Papéis e Permissões" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ShieldCheck size={24} className="text-[#0c4a3e]" /> Papéis e Permissões</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie papéis e suas permissões de acesso</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Novo papel
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="space-y-3">
        {items.map((role) => (
          <div key={role.id} className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
            <button onClick={() => setExpanded(expanded === role.id ? null : role.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {role.name}
                    {role.builtIn && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded font-medium">Nativo</span>}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{role.key}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{role.permissions.length} permissões</span>
                {expanded === role.id ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </div>
            </button>
            {expanded === role.id && (
              <div className="border-t px-4 py-3 bg-gray-50/50">
                {role.description && <p className="text-sm text-gray-500 mb-3">{role.description}</p>}
                {role.permissions.length === 0 ? (
                  <p className="text-xs text-gray-400">Sem permissões atribuídas</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full font-mono">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-8 text-center text-gray-400">Nenhum papel cadastrado</div>}
      </div>

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} title="Novo Papel">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Chave" required><input value={key} onChange={(e) => setKey(e.target.value)} className={inputClass} placeholder="ex: team_lead" required /></FormField>
            <FormField label="Nome" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="ex: Líder de Equipe" required /></FormField>
          </div>
          <FormField label="Descrição"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></FormField>
          <FormField label="Permissões">
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {modules.map(mod => (
                <div key={mod} className="space-y-0.5">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider pt-1">{mod}</div>
                  <div className="flex flex-wrap gap-1">
                    {actions.map(act => {
                      const p = `${mod}:${act}`;
                      return (
                        <label key={p} className="flex items-center gap-1 text-xs cursor-pointer px-1.5 py-0.5 rounded hover:bg-gray-100">
                          <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} className="rounded border-gray-300 text-[#0c4a3e] focus:ring-[#0c4a3e] w-3 h-3" />
                          {act}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </FormField>
          <FormActions onCancel={() => setFormOpen(false)} loading={saving} label="Criar" />
        </form>
      </FormDialog>
    </div>
  );
}
