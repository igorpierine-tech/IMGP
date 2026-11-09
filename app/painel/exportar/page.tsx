"use client";

import { useState } from "react";
import { appPath } from "@/lib/app-path";
import { Download, FileSpreadsheet, FileJson, Loader2, CheckCircle2 } from "lucide-react";

const entities = [
  { value: "projects", label: "Projetos", icon: "folder" },
  { value: "tasks", label: "Tarefas", icon: "check" },
  { value: "demands", label: "Demandas", icon: "file" },
  { value: "time_entries", label: "Apontamentos de horas", icon: "clock" },
] as const;

type Format = "csv" | "json";

export default function ExportarPage() {
  const [entity, setEntity] = useState<string>("projects");
  const [format, setFormat] = useState<Format>("csv");
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState("");

  async function doExport() {
    setExporting(true); setSuccess("");
    try {
      const r = await fetch(appPath(`/api/export?entity=${entity}&format=${format}`), { credentials: "include" });
      if (!r.ok) { const b = await r.json() as { error?: string }; throw new Error(b.error ?? "Erro"); }
      const blob = await r.blob();
      const disposition = r.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `${entity}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      setSuccess(`${filename} exportado com sucesso.`);
    } catch {}
    finally { setExporting(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exportar Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">Exporte dados do sistema em CSV ou JSON</p>
      </div>

      <div className="bg-white rounded-xl border p-6 max-w-lg space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Dados para exportar</label>
          <div className="space-y-2">
            {entities.map((e) => (
              <label key={e.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${entity === e.value ? "border-[#0c4a3e] bg-[#0c4a3e]/5" : "border-gray-200 hover:bg-gray-50"}`}>
                <input type="radio" name="entity" value={e.value} checked={entity === e.value}
                  onChange={() => setEntity(e.value)} className="accent-[#0c4a3e]" />
                <span className="text-sm text-gray-900">{e.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Formato</label>
          <div className="flex gap-3">
            <button onClick={() => setFormat("csv")}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${format === "csv" ? "border-[#0c4a3e] bg-[#0c4a3e]/5 text-[#0c4a3e]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <FileSpreadsheet size={18} /> CSV
            </button>
            <button onClick={() => setFormat("json")}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${format === "json" ? "border-[#0c4a3e] bg-[#0c4a3e]/5 text-[#0c4a3e]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <FileJson size={18} /> JSON
            </button>
          </div>
        </div>

        <button onClick={doExport} disabled={exporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg disabled:opacity-50 transition-colors">
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? "Exportando..." : "Exportar"}
        </button>

        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}
      </div>
    </div>
  );
}
