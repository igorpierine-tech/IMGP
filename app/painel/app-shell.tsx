"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPath } from "@/lib/app-path";
import {
  LayoutDashboard, KanbanSquare, Target, FolderKanban, CalendarDays,
  BarChart3, ShieldCheck, Settings, Menu, X, ChevronLeft,
  FileText, Search, Activity, Star, Users, ArrowLeft
} from "lucide-react";

type User = { id: string; email: string; displayName: string; role: string };

const NAV_ITEMS = [
  { href: "/painel", label: "Dashboard", icon: LayoutDashboard },
  { href: "/painel/meu-painel", label: "Meu Painel", icon: Star },
  { href: "/painel/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/painel/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/painel/okrs", label: "OKRs / Metas", icon: Target },
  { href: "/painel/portfolios", label: "Portfólios", icon: FolderKanban },
  { href: "/painel/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/painel/aprovacoes", label: "Aprovações", icon: ShieldCheck },
  { href: "/painel/atividade", label: "Atividade", icon: Activity },
  { href: "/painel/preferencias", label: "Preferências", icon: Settings },
];

const roleNames: Record<string, string> = {
  project_coordinator: "Coordenador",
  it_director: "Diretor de TI",
  project_analyst: "Analista",
  keyuser: "Keyuser",
  requester: "Solicitante",
  area_manager: "Gerente",
  viewer: "Consulta",
};

export default function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const basePath = appPath("");

  function isActive(href: string) {
    const full = appPath(href);
    if (href === "/painel") return pathname === full;
    return pathname.startsWith(full);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-200
        ${collapsed ? "w-16" : "w-60"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static
      `}>
        <div className={`flex items-center gap-2 px-4 h-14 border-b border-gray-100 ${collapsed ? "justify-center" : ""}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0c4a3e] text-white flex items-center justify-center text-xs font-bold shrink-0">RR</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">Raízes e Riquezas</div>
                <div className="text-[10px] text-gray-500 truncate">Gestão de Projetos</div>
              </div>
            </div>
          )}
          {collapsed && <div className="w-8 h-8 rounded-lg bg-[#0c4a3e] text-white flex items-center justify-center text-xs font-bold">RR</div>}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-gray-400 hover:text-gray-600 hidden lg:block">
            <ChevronLeft size={16} className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-gray-400 lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5
                  ${active ? "bg-[#0c4a3e] text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                  ${collapsed ? "justify-center" : ""}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`border-t border-gray-100 p-3 ${collapsed ? "text-center" : ""}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0c4a3e] text-white flex items-center justify-center text-xs font-medium shrink-0">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{user.displayName}</div>
                <div className="text-[11px] text-gray-500 truncate">{roleNames[user.role] ?? user.role}</div>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0c4a3e] text-white flex items-center justify-center text-xs font-medium mx-auto" title={user.displayName}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <a
            href={appPath("/legacy")}
            className={`flex items-center gap-2 mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <ArrowLeft size={12} />
            {!collapsed && <span>Modo legado</span>}
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500 lg:hidden">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar projetos, tarefas..."
              className="pl-9 pr-3 py-1.5 text-sm bg-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-[#0c4a3e]/20 focus:bg-white w-48 lg:w-64 transition-all"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
