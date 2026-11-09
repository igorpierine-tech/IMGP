"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Users, Plus, Shield, ToggleLeft, ToggleRight, Edit2 } from "lucide-react";
import FormDialog, { FormField, FormActions, inputClass, selectClass } from "../components/form-dialog";
import Breadcrumbs from "../components/breadcrumbs";
import { SkeletonTable } from "../components/skeleton";
import EmptyState from "../components/empty-state";
import { useToast } from "../components/toast";
import Pagination from "../components/pagination";

type User = {
  id: string; email: string; displayName: string; role: string;
  active: boolean; mustChangePassword: boolean; lastSeenAt?: string;
};

const roleNames: Record<string, string> = {
  project_coordinator: "Coordenador de Projetos", it_director: "Diretor de TI",
  project_analyst: "Analista de Projetos", keyuser: "Keyuser",
  requester: "Solicitante", area_manager: "Gerente de Área", viewer: "Consulta",
};

const roleOptions = Object.entries(roleNames);

function NovoUsuarioForm({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("keyuser");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !password) { setError("Preencha todos os campos obrigatórios."); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch(appPath("/api/users"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), email: email.trim(), password, role }),
      });
      if (!r.ok) { const b = await r.json() as { error?: string }; throw new Error(b.error ?? "Erro"); }
      onCreated(); onClose();
      setDisplayName(""); setEmail(""); setPassword(""); setRole("keyuser");
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <FormDialog open title="Novo Usuário" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        <FormField label="Nome completo *"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} /></FormField>
        <FormField label="E-mail *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></FormField>
        <FormField label="Senha temporária *"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Mín. 10 caracteres" /></FormField>
        <FormField label="Perfil de acesso">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
            {roleOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </FormField>
        <FormActions onClose={onClose} saving={saving} label="Criar usuário" />
      </form>
    </FormDialog>
  );
}

function EditUserForm({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.active);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = { id: user.id, displayName: displayName.trim(), role, active };
      if (newPassword) body.password = newPassword;
      const r = await fetch(appPath("/api/users"), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const b = await r.json() as { error?: string }; throw new Error(b.error ?? "Erro"); }
      onSaved();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <FormDialog open title="Editar Usuário" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        <FormField label="Nome"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} /></FormField>
        <FormField label="E-mail"><input value={user.email} readOnly className={`${inputClass} bg-gray-50`} /></FormField>
        <FormField label="Perfil">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
            {roleOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </FormField>
        <FormField label="Nova senha (opcional)"><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Deixe vazio para manter" /></FormField>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setActive(!active)} className="text-gray-600">
            {active ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-gray-400" />}
          </button>
          <span className="text-sm text-gray-700">{active ? "Ativo" : "Inativo"}</span>
        </div>
        <FormActions onClose={onClose} saving={saving} label="Salvar" />
      </form>
    </FormDialog>
  );
}

export default function UsuariosPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNovo, setShowNovo] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    fetch(appPath("/api/users"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { users?: User[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro");
        setUsers(body.users ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const filtered = filter
    ? users.filter((u) => u.displayName.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase()) || (roleNames[u.role] ?? u.role).toLowerCase().includes(filter.toLowerCase()))
    : users;

  const totalFiltered = filtered.length;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Usuários" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">Gerenciamento de acessos e permissões</p>
        </div>
        <button onClick={() => setShowNovo(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors">
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <NovoUsuarioForm open={showNovo} onClose={() => setShowNovo(false)} onCreated={() => { setRefreshKey((k) => k + 1); toast("Usuário criado com sucesso"); }} />
      {editing && <EditUserForm user={editing} onClose={() => setEditing(null)} onSaved={() => { setRefreshKey((k) => k + 1); setEditing(null); toast("Usuário atualizado"); }} />}

      <div>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar por nome, email ou perfil..."
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-full max-w-sm focus:ring-2 focus:ring-[#0c4a3e]/20 focus:border-[#0c4a3e] outline-none" />
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : totalFiltered === 0 ? (
        <EmptyState icon="generic" title="Nenhum usuário encontrado" action={{ label: "Novo Usuário", onClick: () => setShowNovo(true) }} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-white rounded-xl border overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50 text-gray-500 text-left">
                <th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">E-mail</th>
                <th className="p-3 font-medium">Perfil</th><th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Último acesso</th><th className="p-3 font-medium w-10"></th>
              </tr></thead>
              <tbody>
                {paginated.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0c4a3e] text-white flex items-center justify-center text-xs font-medium">{u.displayName.charAt(0).toUpperCase()}</div>
                        <span className="font-medium text-gray-900">{u.displayName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">{u.email}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{roleNames[u.role] ?? u.role}</span></td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {u.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 text-xs">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "Nunca"}</td>
                    <td className="p-3">
                      <button onClick={() => setEditing(u)} className="text-gray-400 hover:text-gray-600"><Edit2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 pb-3">
              <Pagination currentPage={currentPage} totalItems={totalFiltered} pageSize={pageSize} onPageChange={(p) => setCurrentPage(p)} />
            </div>
          </div>
          <div className="space-y-3 md:hidden">
            {paginated.map((u) => (
              <div key={u.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[#0c4a3e] text-white flex items-center justify-center text-sm font-medium">{u.displayName.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{u.displayName}</div>
                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                  </div>
                  <button onClick={() => setEditing(u)} className="text-gray-400 hover:text-gray-600"><Edit2 size={16} /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{roleNames[u.role] ?? u.role}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            ))}
            <Pagination currentPage={currentPage} totalItems={totalFiltered} pageSize={pageSize} onPageChange={(p) => setCurrentPage(p)} />
          </div>
        </>
      )}
    </div>
  );
}
