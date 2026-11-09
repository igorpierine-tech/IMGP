"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, Send, MessageSquare } from "lucide-react";

type Comment = {
  id: number; body: string; displayName?: string; userId: string;
  createdAt: string; editedAt?: string; parentId?: number;
};

export default function CommentsSection({ entityType, entityId }: { entityType: string; entityId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  function load() {
    setLoading(true);
    fetch(appPath(`/api/comments?entityType=${entityType}&entityId=${entityId}`), { credentials: "include" })
      .then((r) => r.json() as Promise<{ comments: Comment[] }>)
      .then((res) => setComments(res.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [entityType, entityId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(appPath("/api/comments"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, body: text.trim() }),
      });
      if (!r.ok) { const b = await r.json() as { error?: string }; throw new Error(b.error ?? "Erro"); }
      setText("");
      load();
    } catch { }
    finally { setSending(false); }
  }

  function timeAgo(dt: string) {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0c4a3e]/20 focus:border-[#0c4a3e] outline-none" />
        <button type="submit" disabled={sending || !text.trim()}
          className="px-3 py-2 text-sm font-medium text-white bg-[#0c4a3e] rounded-lg hover:bg-[#0a3d33] disabled:opacity-50 flex items-center gap-1.5">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
        </button>
      </form>

      {loading ? (
        <div className="text-gray-400 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando...</div>
      ) : comments.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum comentário ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-[#0c4a3e] text-white flex items-center justify-center text-[10px] font-medium">
                  {(c.displayName ?? "?").charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{c.displayName ?? "Usuário"}</span>
                <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                {c.editedAt && <span className="text-xs text-gray-400">(editado)</span>}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
