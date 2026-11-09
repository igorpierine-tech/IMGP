import { eq } from "drizzle-orm";
import { projects, projectItems, sprints } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", ["project_coordinator", "it_director", "project_analyst"]);

    const body = await request.json() as Record<string, unknown>;
    const sourceProjectId = Number(body.sourceProjectId);
    const newName = String(body.name ?? "").trim();
    const includeItems = body.includeItems !== false;
    const includeSprints = body.includeSprints !== false;

    if (!sourceProjectId) throw new HttpError(400, "sourceProjectId é obrigatório.");

    const [source] = await ctx.db.select().from(projects).where(eq(projects.id, sourceProjectId)).limit(1);
    if (!source) throw new HttpError(404, "Projeto origem não encontrado.");

    const cloneName = newName || `${source.name} (cópia)`;

    const [cloned] = await ctx.db.insert(projects).values({
      source: "platform",
      name: cloneName,
      projectTypeId: source.projectTypeId,
      area: source.area,
      managerName: source.managerName,
      managerUserId: source.managerUserId,
      status: "planning",
      health: "on_track",
      progress: 0,
      plannedHours: source.plannedHours,
      plannedCost: source.plannedCost,
    }).returning();

    const sprintMap = new Map<number, number>();

    if (includeSprints) {
      const sourceSprints = await ctx.db.select().from(sprints).where(eq(sprints.projectId, sourceProjectId));
      for (const s of sourceSprints) {
        const [newSprint] = await ctx.db.insert(sprints).values({
          projectId: cloned.id,
          name: s.name,
          objective: s.objective,
          status: "planned",
        }).returning();
        sprintMap.set(s.id, newSprint.id);
      }
    }

    let itemsCloned = 0;
    if (includeItems) {
      const sourceItems = await ctx.db.select().from(projectItems).where(eq(projectItems.projectId, sourceProjectId));
      const oldToNewId = new Map<number, number>();

      for (const item of sourceItems) {
        const [newItem] = await ctx.db.insert(projectItems).values({
          projectId: cloned.id,
          sprintId: item.sprintId ? (sprintMap.get(item.sprintId) ?? null) : null,
          kind: item.kind,
          name: item.name,
          status: "planned",
          assignedUserId: item.assignedUserId,
          assignedName: item.assignedName,
          plannedHours: item.plannedHours,
        }).returning();
        oldToNewId.set(item.id, newItem.id);
        itemsCloned++;
      }

      for (const item of sourceItems) {
        if (item.parentId && oldToNewId.has(item.parentId) && oldToNewId.has(item.id)) {
          await ctx.db.update(projectItems).set({ parentId: oldToNewId.get(item.parentId)! }).where(eq(projectItems.id, oldToNewId.get(item.id)!));
        }
      }
    }

    await writeAudit({
      actor: ctx.user,
      action: "project.cloned",
      entityType: "project",
      entityId: cloned.id,
      requestId: request.headers.get("cf-ray"),
      after: { sourceProjectId, newProjectId: cloned.id, itemsCloned, sprintsCloned: sprintMap.size },
    });

    return Response.json({
      project: cloned,
      cloned: { sprints: sprintMap.size, items: itemsCloned },
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
