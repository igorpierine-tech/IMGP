import { eq, desc } from "drizzle-orm";
import { projectItems, taskDependencies, projects, sprints } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:read", [
      "project_coordinator", "it_director", "project_analyst", "keyuser", "requester", "area_manager", "viewer",
    ]);

    const url = new URL(request.url);
    const projectId = Number(url.searchParams.get("projectId"));
    if (!projectId) throw new HttpError(400, "projectId é obrigatório.");

    const [project] = await ctx.db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new HttpError(404, "Projeto não encontrado.");

    const items = await ctx.db
      .select()
      .from(projectItems)
      .where(eq(projectItems.projectId, projectId))
      .orderBy(projectItems.plannedStart);

    const deps = await ctx.db
      .select()
      .from(taskDependencies);

    const itemIds = new Set(items.map(i => i.id));
    const relevantDeps = deps.filter(d => itemIds.has(d.predecessorId) || itemIds.has(d.successorId));

    const projectSprints = await ctx.db
      .select()
      .from(sprints)
      .where(eq(sprints.projectId, projectId))
      .orderBy(sprints.startDate);

    const ganttItems = items.map(item => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      status: item.status,
      health: item.health,
      assignedName: item.assignedName,
      plannedStart: item.plannedStart,
      plannedEnd: item.plannedEnd,
      actualStart: item.actualStart,
      actualEnd: item.actualEnd,
      parentId: item.parentId,
      sprintId: item.sprintId,
      dependencies: relevantDeps
        .filter(d => d.successorId === item.id)
        .map(d => ({ predecessorId: d.predecessorId, type: d.type, lagDays: d.lagDays })),
    }));

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        plannedStart: project.plannedStart,
        plannedEnd: project.plannedEnd,
      },
      items: ganttItems,
      sprints: projectSprints,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
