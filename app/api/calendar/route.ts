import { sql, and, gte, lte, or } from "drizzle-orm";
import { projectItems, projects, sprints } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:read", [
      "project_coordinator", "it_director", "project_analyst", "keyuser", "requester", "area_manager", "viewer",
    ]);

    const url = new URL(request.url);
    const start = url.searchParams.get("start") ?? "";
    const end = url.searchParams.get("end") ?? "";
    const userId = url.searchParams.get("userId");

    if (!start || !end) throw new HttpError(400, "Parâmetros start e end são obrigatórios (YYYY-MM-DD).");

    const conditions = [
      or(
        and(gte(projectItems.plannedStart, start), lte(projectItems.plannedStart, end)),
        and(gte(projectItems.plannedEnd, start), lte(projectItems.plannedEnd, end)),
        and(lte(projectItems.plannedStart, start), gte(projectItems.plannedEnd, end)),
      ),
    ];

    if (userId) {
      conditions.push(sql`${projectItems.assignedUserId} = ${userId}`);
    }

    const items = await ctx.db
      .select({
        id: projectItems.id,
        name: projectItems.name,
        kind: projectItems.kind,
        status: projectItems.status,
        health: projectItems.health,
        projectId: projectItems.projectId,
        assignedName: projectItems.assignedName,
        assignedUserId: projectItems.assignedUserId,
        plannedStart: projectItems.plannedStart,
        plannedEnd: projectItems.plannedEnd,
        actualStart: projectItems.actualStart,
        actualEnd: projectItems.actualEnd,
      })
      .from(projectItems)
      .where(and(...conditions))
      .limit(500);

    const sprintList = await ctx.db
      .select({
        id: sprints.id,
        name: sprints.name,
        projectId: sprints.projectId,
        startDate: sprints.startDate,
        endDate: sprints.endDate,
        status: sprints.status,
      })
      .from(sprints)
      .where(or(
        and(gte(sprints.startDate, start), lte(sprints.startDate, end)),
        and(gte(sprints.endDate, start), lte(sprints.endDate, end)),
      ))
      .limit(50);

    const events = [
      ...items.map(i => ({
        id: `item-${i.id}`,
        title: i.name,
        type: "task" as const,
        kind: i.kind,
        status: i.status,
        health: i.health,
        start: i.plannedStart,
        end: i.plannedEnd,
        projectId: i.projectId,
        assignedName: i.assignedName,
      })),
      ...sprintList.map(s => ({
        id: `sprint-${s.id}`,
        title: s.name,
        type: "sprint" as const,
        kind: "sprint" as const,
        status: s.status,
        health: null,
        start: s.startDate,
        end: s.endDate,
        projectId: s.projectId,
        assignedName: null,
      })),
    ];

    return Response.json({ events, count: events.length });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
