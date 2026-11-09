import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { projects, projectItems, demands, timeEntries } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

interface PeriodStats {
  projectsCreated: number;
  projectsCompleted: number;
  tasksCreated: number;
  tasksCompleted: number;
  demandsCreated: number;
  demandsResolved: number;
  minutesLogged: number;
}

async function getPeriodStats(db: any, start: string, end: string): Promise<PeriodStats> {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end + "T23:59:59").getTime();

  const [projCreated] = await db.select({ c: count() }).from(projects)
    .where(and(gte(projects.createdAt, new Date(startMs)), lte(projects.createdAt, new Date(endMs))));

  const [projCompleted] = await db.select({ c: count() }).from(projects)
    .where(and(eq(projects.status, "completed"), gte(projects.updatedAt, new Date(startMs)), lte(projects.updatedAt, new Date(endMs))));

  const [tasksCreated] = await db.select({ c: count() }).from(projectItems)
    .where(and(gte(projectItems.createdAt, new Date(startMs)), lte(projectItems.createdAt, new Date(endMs))));

  const [tasksCompleted] = await db.select({ c: count() }).from(projectItems)
    .where(and(eq(projectItems.status, "done"), gte(projectItems.updatedAt, new Date(startMs)), lte(projectItems.updatedAt, new Date(endMs))));

  const [demandsCreated] = await db.select({ c: count() }).from(demands)
    .where(and(gte(demands.createdAt, new Date(startMs)), lte(demands.createdAt, new Date(endMs))));

  const [demandsResolved] = await db.select({ c: count() }).from(demands)
    .where(and(eq(demands.stage, "Concluída"), gte(demands.updatedAt, new Date(startMs)), lte(demands.updatedAt, new Date(endMs))));

  const minutesResult = await db.select({ total: sql<number>`COALESCE(SUM(${timeEntries.totalMinutes}), 0)` }).from(timeEntries)
    .where(and(gte(timeEntries.createdAt, new Date(startMs)), lte(timeEntries.createdAt, new Date(endMs))));

  return {
    projectsCreated: projCreated?.c ?? 0,
    projectsCompleted: projCompleted?.c ?? 0,
    tasksCreated: tasksCreated?.c ?? 0,
    tasksCompleted: tasksCompleted?.c ?? 0,
    demandsCreated: demandsCreated?.c ?? 0,
    demandsResolved: demandsResolved?.c ?? 0,
    minutesLogged: minutesResult[0]?.total ?? 0,
  };
}

function computeVariation(current: number, previous: number): { absolute: number; percentage: number | null } {
  const absolute = current - previous;
  const percentage = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  return { absolute, percentage };
}

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "dashboard:read", ["project_coordinator", "it_director", "project_analyst"]);

    const url = new URL(request.url);
    const periodAStart = url.searchParams.get("periodAStart");
    const periodAEnd = url.searchParams.get("periodAEnd");
    const periodBStart = url.searchParams.get("periodBStart");
    const periodBEnd = url.searchParams.get("periodBEnd");

    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      throw new HttpError(400, "Parâmetros obrigatórios: periodAStart, periodAEnd, periodBStart, periodBEnd (YYYY-MM-DD).");
    }

    const [periodA, periodB] = await Promise.all([
      getPeriodStats(ctx.db, periodAStart, periodAEnd),
      getPeriodStats(ctx.db, periodBStart, periodBEnd),
    ]);

    const comparison = {
      projectsCreated: computeVariation(periodB.projectsCreated, periodA.projectsCreated),
      projectsCompleted: computeVariation(periodB.projectsCompleted, periodA.projectsCompleted),
      tasksCreated: computeVariation(periodB.tasksCreated, periodA.tasksCreated),
      tasksCompleted: computeVariation(periodB.tasksCompleted, periodA.tasksCompleted),
      demandsCreated: computeVariation(periodB.demandsCreated, periodA.demandsCreated),
      demandsResolved: computeVariation(periodB.demandsResolved, periodA.demandsResolved),
      minutesLogged: computeVariation(periodB.minutesLogged, periodA.minutesLogged),
    };

    return Response.json({ periodA, periodB, comparison });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
