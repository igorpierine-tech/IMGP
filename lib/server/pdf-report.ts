import { sql, desc, eq } from "drizzle-orm";
import { projects, projectItems, demands, timeEntries } from "../../db/schema";
import type { ApiContext } from "./api-context";
import { HttpError } from "./errors";

type ReportType = "projects" | "demands" | "tasks" | "time_entries";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function formatDate(d: Date | number | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("pt-BR");
}

async function fetchReportData(ctx: ApiContext, type: ReportType, projectId?: number) {
  switch (type) {
    case "projects":
      return ctx.db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(100);
    case "demands":
      return ctx.db.select().from(demands).orderBy(desc(demands.updatedAt)).limit(200);
    case "tasks": {
      if (projectId) return ctx.db.select().from(projectItems).where(eq(projectItems.projectId, projectId)).orderBy(desc(projectItems.updatedAt)).limit(500);
      return ctx.db.select().from(projectItems).orderBy(desc(projectItems.updatedAt)).limit(500);
    }
    case "time_entries": {
      if (projectId) return ctx.db.select().from(timeEntries).where(eq(timeEntries.projectId, projectId)).orderBy(desc(timeEntries.startedAt)).limit(500);
      return ctx.db.select().from(timeEntries).orderBy(desc(timeEntries.startedAt)).limit(500);
    }
    default:
      throw new HttpError(400, "Tipo de relatório inválido.");
  }
}

function buildProjectsHtml(rows: (typeof projects.$inferSelect)[]) {
  const tableRows = rows.map(p => `
    <tr>
      <td>${escapeXml(p.name)}</td>
      <td>${escapeXml(p.status)}</td>
      <td>${escapeXml(p.health)}</td>
      <td>${p.progress}%</td>
      <td>${escapeXml(p.area ?? "—")}</td>
      <td>${p.plannedStart ?? "—"}</td>
      <td>${p.plannedEnd ?? "—"}</td>
    </tr>
  `).join("");
  return `
    <table>
      <thead><tr><th>Projeto</th><th>Status</th><th>Saúde</th><th>Progresso</th><th>Área</th><th>Início</th><th>Fim</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>`;
}

function buildDemandsHtml(rows: (typeof demands.$inferSelect)[]) {
  const tableRows = rows.map(d => `
    <tr>
      <td>${escapeXml(d.name)}</td>
      <td>${escapeXml(d.stage)}</td>
      <td>${escapeXml(d.area)}</td>
      <td>${escapeXml(d.impact)}</td>
      <td>${d.estimatedHours}h</td>
      <td>R$ ${d.estimatedCost.toFixed(2)}</td>
    </tr>
  `).join("");
  return `
    <table>
      <thead><tr><th>Demanda</th><th>Etapa</th><th>Área</th><th>Impacto</th><th>Horas</th><th>Custo</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>`;
}

function buildTasksHtml(rows: (typeof projectItems.$inferSelect)[]) {
  const tableRows = rows.map(t => `
    <tr>
      <td>${escapeXml(t.name)}</td>
      <td>${escapeXml(t.kind)}</td>
      <td>${escapeXml(t.status)}</td>
      <td>${escapeXml(t.health)}</td>
      <td>${escapeXml(t.assignedName ?? "—")}</td>
      <td>${t.plannedStart ?? "—"}</td>
      <td>${t.plannedEnd ?? "—"}</td>
    </tr>
  `).join("");
  return `
    <table>
      <thead><tr><th>Tarefa</th><th>Tipo</th><th>Status</th><th>Saúde</th><th>Responsável</th><th>Início</th><th>Fim</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>`;
}

function buildTimeEntriesHtml(rows: (typeof timeEntries.$inferSelect)[]) {
  const tableRows = rows.map(t => `
    <tr>
      <td>${t.projectId}</td>
      <td>${t.itemId}</td>
      <td>${escapeXml(t.activity ?? "—")}</td>
      <td>${escapeXml(t.status)}</td>
      <td>${formatDate(t.startedAt)}</td>
      <td>${t.totalMinutes ?? "—"} min</td>
    </tr>
  `).join("");
  return `
    <table>
      <thead><tr><th>Projeto</th><th>Item</th><th>Atividade</th><th>Status</th><th>Início</th><th>Duração</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>`;
}

const REPORT_TITLES: Record<ReportType, string> = {
  projects: "Relatório de Projetos",
  demands: "Relatório de Demandas",
  tasks: "Relatório de Tarefas",
  time_entries: "Relatório de Apontamentos",
};

export async function generateReportHtml(ctx: ApiContext, type: ReportType, projectId?: number): Promise<string> {
  const rows = await fetchReportData(ctx, type, projectId);
  const title = REPORT_TITLES[type];
  const generatedAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  let tableHtml: string;
  switch (type) {
    case "projects": tableHtml = buildProjectsHtml(rows as (typeof projects.$inferSelect)[]); break;
    case "demands": tableHtml = buildDemandsHtml(rows as (typeof demands.$inferSelect)[]); break;
    case "tasks": tableHtml = buildTasksHtml(rows as (typeof projectItems.$inferSelect)[]); break;
    case "time_entries": tableHtml = buildTimeEntriesHtml(rows as (typeof timeEntries.$inferSelect)[]); break;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(title)}</title>
  <style>
    @media print { body { margin: 0; } @page { margin: 15mm; } }
    body { font-family: 'Segoe UI', sans-serif; color: #1f2937; max-width: 1100px; margin: 0 auto; padding: 20px; }
    h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #eff6ff; color: #1e40af; text-align: left; padding: 8px 10px; border-bottom: 2px solid #bfdbfe; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 11px; }
  </style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  <p class="meta">Gerado em: ${escapeXml(generatedAt)} | Total: ${rows.length} registros</p>
  ${tableHtml}
  <div class="footer">Raízes e Riquezas — Gestão Integrada de Projetos</div>
</body>
</html>`;
}
