"use client";

import { useState, useEffect, useRef } from "react";
import { appPath } from "@/lib/app-path";
import { Paperclip, Upload, Trash2, Download, FileText, Image, File, Loader2 } from "lucide-react";
import { useToast } from "./toast";
import ConfirmDialog from "./confirm-dialog";

type Attachment = {
  id: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt: string;
  uploaderName?: string;
};

function fileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return <Image size={16} className="text-blue-500" />;
  if (contentType.includes("pdf")) return <FileText size={16} className="text-red-500" />;
  return <File size={16} className="text-gray-400" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Attachments({ entityType, entityId }: { entityType: string; entityId: number }) {
  const { toast } = useToast();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!entityId) return;
    fetch(appPath(`/api/attachments?entityType=${entityType}&entityId=${entityId}`), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { attachments?: Attachment[] };
        setFiles(body.attachments ?? []);
      })
      .catch(() => {});
  }, [entityType, entityId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("Arquivo excede 10 MB", "error");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", String(entityId));
      const r = await fetch(appPath("/api/attachments"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = await r.json() as { attachment?: Attachment; error?: string };
      if (!r.ok) throw new Error(body.error ?? "Erro no upload");
      if (body.attachment) setFiles((prev) => [body.attachment!, ...prev]);
      toast("Arquivo enviado com sucesso");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const r = await fetch(appPath("/api/attachments"), {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!r.ok) {
        const body = await r.json() as { error?: string };
        throw new Error(body.error ?? "Erro ao excluir");
      }
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      toast("Arquivo excluído");
    } catch (err: any) {
      toast(err.message, "error");
    }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Paperclip size={16} /> Anexos ({files.length})
        </h3>
        <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0c4a3e] border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Enviando..." : "Enviar arquivo"}
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">Nenhum anexo.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group transition-colors">
              {fileIcon(f.contentType)}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 truncate">{f.fileName}</div>
                <div className="text-[10px] text-gray-400">{formatSize(f.fileSize)} · {new Date(f.createdAt).toLocaleDateString("pt-BR")}</div>
              </div>
              <a
                href={appPath(`/api/attachments?id=${f.id}`)}
                className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Baixar"
              >
                <Download size={14} />
              </a>
              <button
                onClick={() => setDeleteTarget(f)}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir anexo"
        message={`Deseja excluir "${deleteTarget?.fileName}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
