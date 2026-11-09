"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { appPath } from "@/lib/app-path";
import { Search, Loader2, FolderOpen, CheckCircle2, FileText, X } from "lucide-react";

type SearchResult = {
  type: string; id: number; name: string; status?: string;
  projectName?: string; area?: string;
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function search(q: string) {
    setQuery(q);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true); setOpen(true);
      try {
        const r = await fetch(appPath(`/api/search?q=${encodeURIComponent(q.trim())}&limit=10`), { credentials: "include" });
        const body = await r.json() as { results: SearchResult[] };
        setResults(body.results ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }

  function navigate(item: SearchResult) {
    setOpen(false); setQuery("");
    if (item.type === "project") router.push(appPath(`/painel/projeto?id=${item.id}`));
    else if (item.type === "task" || item.type === "project_item") router.push(appPath("/painel/kanban"));
    else if (item.type === "demand") router.push(appPath("/painel/demandas"));
  }

  const typeIcon = (type: string) => {
    if (type === "project") return <FolderOpen size={14} className="text-blue-500" />;
    if (type === "task" || type === "project_item") return <CheckCircle2 size={14} className="text-emerald-500" />;
    return <FileText size={14} className="text-amber-500" />;
  };

  const typeLabel = (type: string) => {
    if (type === "project") return "Projeto";
    if (type === "task" || type === "project_item") return "Tarefa";
    if (type === "demand") return "Demanda";
    return type;
  };

  return (
    <div className="relative" ref={ref}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input type="text" value={query} onChange={(e) => search(e.target.value)}
        onFocus={() => { if (query.trim() && results.length > 0) setOpen(true); }}
        placeholder="Buscar projetos, tarefas..."
        className="pl-9 pr-8 py-1.5 text-sm bg-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-[#0c4a3e]/20 focus:bg-white w-48 lg:w-64 transition-all" />
      {query && (
        <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border shadow-lg z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">Nenhum resultado para "{query}"</div>
          ) : (
            results.map((item) => (
              <button key={`${item.type}-${item.id}`} onClick={() => navigate(item)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-0 transition-colors flex items-center gap-3">
                {typeIcon(item.type)}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                  <div className="text-xs text-gray-400">{typeLabel(item.type)}{item.projectName ? ` · ${item.projectName}` : ""}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
