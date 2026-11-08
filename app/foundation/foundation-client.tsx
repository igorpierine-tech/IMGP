"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowLeft, CheckCircle2, Cloud, Database, FileClock, Loader2, ShieldCheck, Users } from "lucide-react";
import { appPath } from "@/lib/app-path";

type Status = {
  user: { displayName: string; email: string; role: string };
  database: { provider: string; projects: number; items: number; timeEntries: number; users: number };
  security: { authenticated: boolean; authorization: string; auditEnabled: boolean };
  audit: Array<{ id: number; occurredAt: string; actorEmail?: string; action: string; entityType: string; entityId?: string }>;
};

const roleNames: Record<string, string> = {
  project_coordinator: "Coordenador de Projetos",
  it_director: "Diretor de TI",
  project_analyst: "Analista de Projetos",
  keyuser: "Keyuser",
  requester: "Solicitante",
  area_manager: "Gerente/Diretor da área",
  viewer: "Consulta",
};

function dateTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function FoundationClient() {
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(appPath("/api/foundation/status"), { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as Status & { error?: string };
        if (!response.ok) throw new Error(body.error || "Falha ao carregar a fundação produtiva.");
        return body as Status;
      })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Falha ao carregar a fundação produtiva."));
  }, []);

  if (!data && !error) return <main className="foundation-loading"><Loader2 className="spin" /> Preparando a fundação produtiva…</main>;

  return (
    <main className="foundation-shell">
      <header className="foundation-header">
        <a className="back-link" href={appPath("/legacy")}><ArrowLeft size={17} /> Voltar à plataforma</a>
        <div className="foundation-title-row">
          <div>
            <p className="eyebrow">GOVERNANÇA DA PLATAFORMA</p>
            <h1>Fundação produtiva</h1>
            <p className="foundation-subtitle">Dados, segurança e auditoria em uma única visão operacional.</p>
          </div>
          {data && <div className="identity-chip"><span>{data.user.displayName}</span><small>{roleNames[data.user.role] || data.user.role}</small></div>}
        </div>
      </header>

      {error && <div className="foundation-alert"><strong>Atenção</strong><span>{error}</span></div>}

      {data && <>
        <section className="foundation-grid">
          <article className="foundation-card"><div className="foundation-icon blue"><Database /></div><div><span>Banco central</span><strong>{data.database.provider}</strong><small>Persistência estruturada e versionada</small></div><CheckCircle2 className="card-ok" /></article>
          <article className="foundation-card"><div className="foundation-icon green"><ShieldCheck /></div><div><span>Segurança</span><strong>Autenticação + RBAC</strong><small>Permissões aplicadas no servidor</small></div><CheckCircle2 className="card-ok" /></article>
          <article className="foundation-card"><div className="foundation-icon violet"><FileClock /></div><div><span>Auditoria</span><strong>Eventos imutáveis</strong><small>Ator, ação, entidade e horário</small></div><CheckCircle2 className="card-ok" /></article>
        </section>

        <section className="foundation-section">
          <div className="section-heading"><div><p className="eyebrow">BASE CENTRAL</p><h2>Estado dos dados</h2></div><span className="live-pill"><i /> Operacional</span></div>
          <div className="metric-grid">
            <div><Cloud /><strong>{data.database.projects}</strong><span>Projetos</span></div>
            <div><Activity /><strong>{data.database.items}</strong><span>Marcos e tarefas</span></div>
            <div><FileClock /><strong>{data.database.timeEntries}</strong><span>Apontamentos</span></div>
            <div><Users /><strong>{data.database.users}</strong><span>Usuários</span></div>
          </div>
        </section>

        <section className="foundation-section">
          <div className="section-heading"><div><p className="eyebrow">RASTREABILIDADE</p><h2>Eventos recentes</h2></div><a href={appPath("/api/audit")}>Ver API</a></div>
          {data.audit.length > 0 ? <div className="event-list">{data.audit.map((event) => <div className="event-row" key={event.id}><span className="audit-mark" /><div><strong>{event.action}</strong><small>{event.actorEmail || "sistema"} · {event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</small></div><time>{dateTime(event.occurredAt)}</time></div>)}</div> : <p className="empty-state">A trilha será preenchida com as primeiras operações transacionais.</p>}
        </section>
      </>}
    </main>
  );
}
