"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPath } from "@/lib/app-path";
import {
  LayoutDashboard, KanbanSquare, Target, FolderKanban, CalendarDays,
  BarChart3, ShieldCheck, Settings, Menu, X, ChevronLeft,
  FileText, Activity, Star, Users, ArrowLeft, Download,
  Layers, GitBranch, Tag, FileStack, TextCursorInput,
  GitMerge, Zap, Webhook, Key,
} from "lucide-react";
import GlobalSearch from "./components/global-search";
import NotificationDropdown from "./components/notification-dropdown";
import DarkModeToggle from "./components/dark-mode-toggle";

type User = { id: string; email: string; displayName: string; role: string };

type NavGroup = { label: string; items: { href: string; label: string; icon: typeof LayoutDashboard }[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Gestão",
    items: [
      { href: "/painel", label: "Dashboard", icon: LayoutDashboard },
      { href: "/painel/meu-painel", label: "Meu Painel", icon: Star },
      { href: "/painel/kanban", label: "Kanban", icon: KanbanSquare },
      { href: "/painel/calendario", label: "Calendário", icon: CalendarDays },
      { href: "/painel/demandas", label: "Demandas", icon: FileText },
    ],
  },
  {
    label: "Análise",
    items: [
      { href: "/painel/okrs", label: "OKRs / Metas", icon: Target },
      { href: "/painel/portfolios", label: "Portfólios", icon: FolderKanban },
      { href: "/painel/metricas", label: "Métricas", icon: BarChart3 },
      { href: "/painel/atividade", label: "Atividade", icon: Activity },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { href: "/painel/tipos-projeto", label: "Tipos de Projeto", icon: Layers },
      { href: "/painel/fases", label: "Fases", icon: GitBranch },
      { href: "/painel/tags", label: "Tags", icon: Tag },
      { href: "/painel/templates", label: "Templates", icon: FileStack },
      { href: "/painel/campos-personalizados", label: "Campos Custom", icon: TextCursorInput },
      { href: "/painel/papeis", label: "Papéis", icon: ShieldCheck },
      { href: "/painel/cadeias-aprovacao", label: "Aprovações", icon: GitMerge },
      { href: "/painel/automacoes", label: "Automações", icon: Zap },
      { href: "/painel/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/painel/chaves-api", label: "Chaves de API", icon: Key },
    ],
  },
  {
    label: "Configurações",
    items: [
      { href: "/painel/aprovacoes", label: "Aprovações", icon: ShieldCheck },
      { href: "/painel/usuarios", label: "Usuários", icon: Users },
      { href: "/painel/exportar", label: "Exportar", icon: Download },
      { href: "/painel/preferencias", label: "Preferências", icon: Settings },
    ],
  },
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

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      document.documentElement.classList.toggle("dark", isDark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  function isActive(href: string) {
    const full = appPath(href);
    if (href === "/painel") return pathname === full;
    return pathname.startsWith(full);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden animate-fade-in" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#0c4a3e] to-[#083028] transition-all duration-200
        ${collapsed ? "w-16" : "w-60"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static
      `}>
        <div className={`flex items-center gap-2 px-4 h-14 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center text-xs font-bold shrink-0 backdrop-blur-sm">RR</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">Raízes e Riquezas</div>
                <div className="text-[10px] text-emerald-300/70 truncate">Gestão de Projetos</div>
              </div>
            </div>
          )}
          {collapsed && <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center text-xs font-bold backdrop-blur-sm">RR</div>}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-emerald-300/60 hover:text-white hidden lg:block">
            <ChevronLeft size={16} className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-emerald-300/60 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-emerald-300/50 uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              {collapsed && group.label !== "Gestão" && <div className="mx-2 my-2 border-t border-white/10" />}
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5
                      ${active ? "bg-white/15 text-white font-medium shadow-sm" : "text-emerald-100/70 hover:bg-white/10 hover:text-white"}
                      ${collapsed ? "justify-center" : ""}
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={`border-t border-white/10 p-3 ${collapsed ? "text-center" : ""}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-400/20 text-emerald-200 flex items-center justify-center text-xs font-medium shrink-0 ring-1 ring-emerald-400/30">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">{user.displayName}</div>
                <div className="text-[11px] text-emerald-300/60 truncate">{roleNames[user.role] ?? user.role}</div>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-400/20 text-emerald-200 flex items-center justify-center text-xs font-medium mx-auto ring-1 ring-emerald-400/30" title={user.displayName}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <a
            href={appPath("/legacy")}
            className={`flex items-center gap-2 mt-2 text-xs text-emerald-300/40 hover:text-emerald-200 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <ArrowLeft size={12} />
            {!collapsed && <span>Modo legado</span>}
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 gap-3 shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500 lg:hidden">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <GlobalSearch />
          <DarkModeToggle />
          <NotificationDropdown />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 transition-page bg-gradient-to-br from-gray-50 via-gray-50 to-emerald-50/30">
          {children}
        </main>
      </div>
    </div>
  );
}
