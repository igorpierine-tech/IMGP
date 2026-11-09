import { sql, count, eq, and, gte, lte, isNull, ne, desc } from "drizzle-orm";
import { projects, projectItems, demands, timeEntries, auditEvents } from "../../db/schema";
import type { ApiContext } from "./api-context";

export async function getDashboardKpis(ctx: ApiContext) {
  const db = ctx.db;
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86_400_000;

  const [projectStats] = await db
    .select({
      total: count(),
      planning: count(sql`CASE WHEN ${projects.status} = 'planning' THEN 1 END`),
      inProgress: count(sql`CASE WHEN ${projects.status} = 'in_progress' THEN 1 END`),
      completed: count(sql`CASE WHEN ${projects.status} = 'completed' THEN 1 END`),
      onTrack: count(sql`CASE WHEN ${projects.health} = 'on_track' THEN 1 END`),
      attention: count(sql`CASE WHEN ${projects.health} = 'attention' THEN 1 END`),
      late: count(sql`CASE WHEN ${projects.health} = 'late' THEN 1 END`),
    })
    .from(projects);

  const [taskStats] = await db
    .select({
      total: count(),
      planned: count(sql`CASE WHEN ${projectItems.status} = 'planned' THEN 1 END`),
      inProgress: count(sql`CASE WHEN ${projectItems.status} = 'in_progress' THEN 1 END`),
      done: count(sql`CASE WHEN ${projectItems.status} = 'done' THEN 1 END`),
      blocked: count(sql`CASE WHEN ${projectItems.status} = 'blocked' THEN 1 END`),
      overdue: count(sql`CASE WHEN ${projectItems.plannedEnd} < date('now') AND ${projectItems.status} != 'done' THEN 1 END`),
    })
    .from(projectItems);

  const [demandStats] = await db
    .select({
      total: count(),
      triagem: count(sql`CASE WHEN ${demands.stage} = 'Triagem' THEN 1 END`),
      emAnalise: count(sql`CASE WHEN ${demands.stage} = 'Em Análise' THEN 1 END`),
      aprovada: count(sql`CASE WHEN ${demands.stage} = 'Aprovada' THEN 1 END`),
      rejeitada: count(sql`CASE WHEN ${demands.stage} = 'Rejeitada' THEN 1 END`),
    })
    .from(demands);

  const [timeStats] = await db
    .select({
      totalMinutes: sql<number>`COALESCE(SUM(${timeEntries.totalMinutes}), 0)`,
      entriesCount: count(),
    })
    .from(timeEntries)
    .where(gte(timeEntries.startedAt, new Date(thirtyDaysAgo)));

  const projectsByArea = await db
    .select({
      area: projects.area,
      count: count(),
    })
    .from(projects)
    .groupBy(projects.area)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  const recentProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      health: projects.health,
      progress: projects.progress,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .orderBy(sql`${projects.updatedAt} DESC`)
    .limit(5);

  const recentActivity = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      actorEmail: auditEvents.actorEmail,
      occurredAt: auditEvents.occurredAt,
    })
    .from(auditEvents)
    .orderBy(desc(auditEvents.occurredAt))
    .limit(8);

  return {
    projects: projectStats,
    tasks: taskStats,
    demands: demandStats,
    timeTracking: {
      totalHoursLast30Days: Math.round((timeStats?.totalMinutes ?? 0) / 60),
      entriesLast30Days: timeStats?.entriesCount ?? 0,
    },
    projectsByArea,
    recentProjects,
    recentActivity,
  };
}
