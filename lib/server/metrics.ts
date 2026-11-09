import { sql, count, eq, gte, and, desc } from "drizzle-orm";
import { projects, projectItems, demands, timeEntries, sprints } from "../../db/schema";
import type { ApiContext } from "./api-context";

export async function getVelocityMetrics(ctx: ApiContext, projectId?: number) {
  const db = ctx.db;

  const sprintList = projectId
    ? await db.select().from(sprints).where(eq(sprints.projectId, projectId)).orderBy(desc(sprints.createdAt)).limit(10)
    : await db.select().from(sprints).orderBy(desc(sprints.createdAt)).limit(10);

  const velocity: { sprintId: number; sprintName: string; completed: number; total: number }[] = [];

  for (const sprint of sprintList) {
    const [stats] = await db
      .select({
        total: count(),
        completed: count(sql`CASE WHEN ${projectItems.status} = 'done' THEN 1 END`),
      })
      .from(projectItems)
      .where(eq(projectItems.sprintId, sprint.id));

    velocity.push({
      sprintId: sprint.id,
      sprintName: sprint.name,
      completed: stats?.completed ?? 0,
      total: stats?.total ?? 0,
    });
  }

  return velocity;
}

export async function getDemandSlaMetrics(ctx: ApiContext) {
  const db = ctx.db;

  const [slaStats] = await db
    .select({
      total: count(),
      avgResolutionMs: sql<number>`AVG(CASE WHEN ${demands.stage} IN ('Aprovada', 'Rejeitada') THEN ${demands.updatedAt} - ${demands.createdAt} END)`,
      pendingCount: count(sql`CASE WHEN ${demands.stage} IN ('Triagem', 'Em Análise') THEN 1 END`),
      resolvedCount: count(sql`CASE WHEN ${demands.stage} IN ('Aprovada', 'Rejeitada') THEN 1 END`),
    })
    .from(demands);

  const avgResolutionHours = slaStats?.avgResolutionMs
    ? Math.round(slaStats.avgResolutionMs / 3_600_000)
    : null;

  const stageDistribution = await db
    .select({
      stage: demands.stage,
      count: count(),
    })
    .from(demands)
    .groupBy(demands.stage);

  return {
    totalDemands: slaStats?.total ?? 0,
    avgResolutionHours,
    pendingCount: slaStats?.pendingCount ?? 0,
    resolvedCount: slaStats?.resolvedCount ?? 0,
    stageDistribution,
  };
}

export async function getTeamProductivity(ctx: ApiContext, days = 30) {
  const db = ctx.db;
  const since = Date.now() - days * 86_400_000;

  const userStats = await db
    .select({
      userId: timeEntries.userId,
      totalMinutes: sql<number>`COALESCE(SUM(${timeEntries.totalMinutes}), 0)`,
      entriesCount: count(),
    })
    .from(timeEntries)
    .where(gte(timeEntries.startedAt, new Date(since)))
    .groupBy(timeEntries.userId)
    .orderBy(sql`SUM(${timeEntries.totalMinutes}) DESC`)
    .limit(20);

  return userStats.map(s => ({
    userId: s.userId,
    totalHours: Math.round((s.totalMinutes ?? 0) / 60),
    entriesCount: s.entriesCount,
  }));
}

export async function getBurndownData(ctx: ApiContext, sprintId: number) {
  const db = ctx.db;

  const items = await db
    .select({
      id: projectItems.id,
      status: projectItems.status,
      plannedEnd: projectItems.plannedEnd,
      actualEnd: projectItems.actualEnd,
      createdAt: projectItems.createdAt,
    })
    .from(projectItems)
    .where(eq(projectItems.sprintId, sprintId));

  const total = items.length;
  const completedByDate = new Map<string, number>();

  for (const item of items) {
    if (item.status === "done" && item.actualEnd) {
      const date = item.actualEnd;
      completedByDate.set(date, (completedByDate.get(date) ?? 0) + 1);
    }
  }

  const dates = [...completedByDate.keys()].sort();
  let remaining = total;
  const burndown = dates.map(date => {
    remaining -= completedByDate.get(date) ?? 0;
    return { date, remaining };
  });

  return { total, burndown };
}
