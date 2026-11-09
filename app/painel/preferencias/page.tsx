"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Save, Settings } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";

const PREF_OPTIONS: { key: string; label: string; options: { value: string; label: string }[] }[] = [
  { key: "theme", label: "Tema", options: [{ value: "light", label: "Claro" }, { value: "dark", label: "Escuro" }, { value: "system", label: "Sistema" }] },
  { key: "language", label: "Idioma", options: [{ value: "pt-BR", label: "Português (BR)" }, { value: "en", label: "English" }, { value: "es", label: "Español" }] },
  { key: "dateFormat", label: "Formato de data", options: [{ value: "DD/MM/YYYY", label: "DD/MM/AAAA" }, { value: "MM/DD/YYYY", label: "MM/DD/AAAA" }, { value: "YYYY-MM-DD", label: "AAAA-MM-DD" }] },
  { key: "itemsPerPage", label: "Itens por página", options: [{ value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }] },
  { key: "defaultView", label: "Visão padrão", options: [{ value: "dashboard", label: "Dashboard" }, { value: "kanban", label: "Kanban" }, { value: "list", label: "Lista" }] },
  { key: "emailNotifications", label: "Notificações por e-mail", options: [{ value: "all", label: "Todas" }, { value: "important", label: "Apenas importantes" }, { value: "none", label: "Nenhuma" }] },
  { key: "sidebarCollapsed", label: "Sidebar recolhida", options: [{ value: "false", label: "Não" }, { value: "true", label: "Sim" }] },
];

export default function PreferenciasPage() {
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(appPath("/api/preferences"), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { preferences?: Record<string, string>; error?: string };
        if (!r.ok) throw new Error(body.error ?? "Erro");
        setPrefs(body.preferences ?? {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const r = await fetch(appPath("/api/preferences"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_bulk", entries: prefs }),
      });
      const body = await r.json() as { error?: string };
      if (!r.ok) throw new Error(body.error ?? "Erro ao salvar");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumbs items={[{ label: "Preferências" }]} />
      <div><h1 className="text-2xl font-bold text-gray-900">Preferências</h1><p className="text-sm text-gray-500 mt-1">Personalize sua experiência na plataforma</p></div>

      <div className="bg-white rounded-xl border divide-y">
        {PREF_OPTIONS.map((pref) => (
          <div key={pref.key} className="flex items-center justify-between px-5 py-4">
            <label className="text-sm font-medium text-gray-700">{pref.label}</label>
            <select
              value={prefs[pref.key] ?? pref.options[0].value}
              onChange={(e) => setPrefs({ ...prefs, [pref.key]: e.target.value })}
              className="text-sm border rounded-lg px-3 py-1.5 text-gray-600 bg-gray-50"
            >
              {pref.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#0c4a3e] text-white rounded-lg text-sm font-medium hover:bg-[#0a3d33] disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar preferências
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Salvo com sucesso!</span>}
      </div>
    </div>
  );
}
