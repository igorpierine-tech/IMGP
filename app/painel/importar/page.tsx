"use client";

import { useState, useRef, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import Breadcrumbs from "../components/breadcrumbs";
import { useToast } from "../components/toast";

type ImportResult = { imported: number; errors: Array<{ row: number; error: string }> };

const ENTITY_TYPES = [
  { value: "projects", label: "Projetos", fields: "name, area, description, priority, plannedStart, plannedEnd" },
  { value: "tasks", label: "Tarefas", fields: "name, projectId, assignedTo, status, plannedStart, plannedEnd" },
  { value: "demands", label: "Demandas", fields: "title, description, requesterName, priority, area" },
];

export default function ImportarPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [entityType, setEntityType] = useState("projects");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      const r = await fetch(appPath("/api/import"), { method: "POST", credentials: "include", body: formData });
      const b = await r.json() as any;
      if (!r.ok) throw new Error(b.error ?? "Erro na importação");
      setResult({ imported: b.imported, errors: b.errors ?? [] });
      toast(`${b.imported} registros importados`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  const selectedType = ENTITY_TYPES.find(t => t.value === entityType);

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumbs items={[{ label: "Ferramentas" }, { label: "Importação de Dados" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Upload size={24} className="text-[#0c4a3e]" /> Importação de Dados</h1>
        <p className="text-sm text-gray-500 mt-1">Importe projetos, tarefas ou demandas a partir de arquivos CSV</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de dados</label>
          <div className="flex gap-3">
            {ENTITY_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => { setEntityType(t.value); setResult(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${entityType === t.value ? "bg-[#0c4a3e] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          <span className="font-medium">Colunas esperadas:</span> {selectedType?.fields}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Arquivo CSV</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0c4a3e]/30 transition-colors">
            <FileSpreadsheet size={32} className="mx-auto text-gray-300 mb-2" />
            <input ref={fileRef} type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#0c4a3e] file:text-white hover:file:bg-[#0a3d33] cursor-pointer" />
            <p className="text-xs text-gray-400 mt-2">Máximo 5MB, até 500 registros</p>
          </div>
        </div>

        <button type="submit" disabled={!file || loading} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Importar
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      {result && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <div>
              <div className="text-sm font-medium text-emerald-700">{result.imported} registros importados com sucesso</div>
              {result.errors.length > 0 && <div className="text-xs text-emerald-600 mt-0.5">{result.errors.length} linhas com erro</div>}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 border-b flex items-center gap-2 text-sm font-medium text-amber-700">
                <AlertTriangle size={16} /> Erros encontrados
              </div>
              <div className="max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div key={i} className="px-4 py-2 border-b border-gray-50 text-sm flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-16 shrink-0">Linha {err.row}</span>
                    <span className="text-red-600">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
