"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from "lucide-react";

export type SortDir = "asc" | "desc" | null;

export type ColumnDef<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: string[];
  className?: string;
  thClassName?: string;
  getValue?: (row: T) => string | number | null | undefined;
  render?: (row: T) => React.ReactNode;
};

type SortableHeaderProps = {
  label: string;
  sortDir: SortDir;
  onSort: () => void;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: string[];
  filterValue?: string;
  onFilter?: (value: string) => void;
  className?: string;
};

export function SortableHeader({
  label, sortDir, onSort, sortable = true, filterable = false,
  filterOptions, filterValue, onFilter, className = "",
}: SortableHeaderProps) {
  const [showFilter, setShowFilter] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowFilter(false);
    }
    if (showFilter) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilter]);

  return (
    <th className={`p-3 font-medium text-gray-500 relative select-none ${className}`}>
      <div className="flex items-center gap-1">
        {sortable ? (
          <button onClick={onSort} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
            {label}
            {sortDir === "asc" ? <ArrowUp size={13} className="text-[#0c4a3e]" /> :
             sortDir === "desc" ? <ArrowDown size={13} className="text-[#0c4a3e]" /> :
             <ArrowUpDown size={13} className="text-gray-300" />}
          </button>
        ) : (
          <span>{label}</span>
        )}
        {filterable && filterOptions && filterOptions.length > 0 && (
          <div ref={ref} className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowFilter(!showFilter); }}
              className={`p-0.5 rounded transition-colors ${filterValue ? "text-[#0c4a3e]" : "text-gray-300 hover:text-gray-500"}`}
            >
              <Filter size={12} />
            </button>
            {showFilter && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px] animate-in fade-in zoom-in-95">
                <button
                  onClick={() => { onFilter?.(""); setShowFilter(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between ${!filterValue ? "font-medium text-[#0c4a3e]" : "text-gray-600"}`}
                >
                  Todos
                  {filterValue && <X size={11} className="text-gray-400" />}
                </button>
                {filterOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { onFilter?.(opt); setShowFilter(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${filterValue === opt ? "font-medium text-[#0c4a3e] bg-emerald-50" : "text-gray-600"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

export function useSortableTable<T>(data: T[], defaultSort?: string, defaultDir?: SortDir) {
  const [sortKey, setSortKey] = useState<string>(defaultSort ?? "");
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir ?? null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  function toggleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else if (sortDir === "desc") { setSortKey(""); setSortDir(null); }
    else setSortDir("asc");
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  function getSortDir(key: string): SortDir {
    return sortKey === key ? sortDir : null;
  }

  function sortAndFilter(rows: T[], columns: ColumnDef<T>[]): T[] {
    let result = [...rows];

    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const col = columns.find((c) => c.key === key);
      if (!col?.getValue) continue;
      result = result.filter((row) => String(col.getValue!(row) ?? "") === value);
    }

    if (sortKey && sortDir) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.getValue) {
        result.sort((a, b) => {
          const va = col.getValue!(a);
          const vb = col.getValue!(b);
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
          const sa = String(va).toLowerCase();
          const sb = String(vb).toLowerCase();
          return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
        });
      }
    }

    return result;
  }

  return { sortKey, sortDir, filters, toggleSort, setFilter, getSortDir, sortAndFilter };
}
