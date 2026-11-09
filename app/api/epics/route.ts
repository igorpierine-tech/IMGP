import { eq, and, desc } from "drizzle-orm";
import { projectItems, projects } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { writeAudit } from "@/lib/server/audit";

const allRoles = [
  "project_coordinator", "it_director", "project_analyst", "keyuser", "requester", "area_manager", "viewer",
] as const;
const editors = ["project_coordinator", "it_director", "project_analyst"] as const;

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:read", allRoles);

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    let rows;
    if (projectId) {
      rows = await ctx.db
        .select({
          id: projectItems.id,
          projectId: projectItems.projectId,
          name: projectItems.name,
          status: projectItems.status,
          health: projectItems.health,
          assignedName: projectItems.assignedName,
          assignedUserId: projectItems.assignedUserId,
          plannedStart: projectItems.plannedStart,
          plannedEnd: projectItems.plannedEnd,
          actualStart: projectItems.actualStart,
          actualEnd: projectItems.actualEnd,
          groupName: projectItems.groupName,
          createdAt: projectItems.createdAt,
        })
        .from(projectItems)
        .where(and(eq(projectItems.projectId, Number(projectId)), eq(projectItems.kind, "epic")))
        .orderBy(desc(projectItems.createdAt));
    } else {
      rows = await ctx.db
        .select({
          id: projectItems.id,
          projectId: projectItems.projectId,
          projectName: projects.name,
          name: projectItems.name,
          status: projectItems.status,
          health: projectItems.health,
          assignedName: projectItems.assignedName,
          assignedUserId: projectItems.assignedUserId,
          plannedStart: projectItems.plannedStart,
          plannedEnd: projectItems.plannedEnd,
          actualStart: projectItems.actualStart,
          actualEnd: projectItems.actualEnd,
          groupName: projectItems.groupName,
          createdAt: projectItems.createdAt,
        })
        .from(projectItems)
        .innerJoin(projects, eq(projectItems.projectId, projects.id))
        .where(eq(projectItems.kind, "epic"))
        .orderBy(desc(projectItems.createdAt));
    }

    const childCounts = await ctx.db
      .select({ parentId: projectItems.parentId, id: projectItems.id })
      .from(projectItems)
      .where(eq(projectItems.kind, "task"));
    const epicChildMap = new Map<number, number>();
    for (const c of childCounts) {
      if (c.parentId) epicChildMap.set(c.parentId, (epicChildMap.get(c.parentId) ?? 0) + 1);
    }

    const epics = rows.map((r: any) => ({
      ...r,
      childCount: epicChildMap.get(r.id) ?? 0,
    }));

    return Response.json({ epics });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", editors);

    const body = await request.json() as Record<string, unknown>;
    const projectId = positiveInteger(body.projectId);
    const name = clean(body.name, 250);
    if (!projectId || !name) throw new HttpError(400, "Projeto e nome do épico são obrigatórios.");

    const [project] = await ctx.db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new HttpError(404, "Projeto não encontrado.");

    const [created] = await ctx.db.insert(projectItems).values({
      projectId,
      kind: "epic",
      name,
      groupName: clean(body.groupName, 120) || null,
      status: clean(body.status, 80) || "planned",
      assignedName: clean(body.assignedName, 180) || null,
      plannedStart: clean(body.plannedStart, 10) || null,
      plannedEnd: clean(body.plannedEnd, 10) || null,
      plannedHours: finiteNumber(body.plannedHours),
      source: "platform",
    }).returning();

    await writeAudit({
      actor: ctx.user, action: "epic.created", entityType: "project_item",
      entityId: created.id, requestId: request.headers.get("cf-ray"), after: created, db: ctx.db,
    });

    return Response.json({ epic: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", editors);

    const body = await request.json() as Record<string, unknown>;
    const id = positiveInteger(body.id);
    if (!id) throw new HttpError(400, "Épico não informado.");

    const [before] = await ctx.db.select().from(projectItems).where(eq(projectItems.id, id)).limit(1);
    if (!before || before.kind !== "epic") throw new HttpError(404, "Épico não encontrado.");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = clean(body.name, 250);
    if (body.status !== undefined) updates.status = clean(body.status, 80);
    if (body.assignedName !== undefined) updates.assignedName = clean(body.assignedName, 180) || null;
    if (body.plannedStart !== undefined) updates.plannedStart = clean(body.plannedStart, 10) || null;
    if (body.plannedEnd !== undefined) updates.plannedEnd = clean(body.plannedEnd, 10) || null;
    if (body.groupName !== undefined) updates.groupName = clean(body.groupName, 120) || null;

    const [updated] = await ctx.db.update(projectItems).set(updates).where(eq(projectItems.id, id)).returning();
    await writeAudit({
      actor: ctx.user, action: "epic.updated", entityType: "project_item",
      entityId: id, requestId: request.headers.get("cf-ray"), before, after: updated, db: ctx.db,
    });

    return Response.json({ epic: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:delete", ["project_coordinator", "it_director"]);

    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) throw new HttpError(400, "ID do épico é obrigatório.");

    const [before] = await ctx.db.select().from(projectItems).where(eq(projectItems.id, id)).limit(1);
    if (!before || before.kind !== "epic") throw new HttpError(404, "Épico não encontrado.");

    await ctx.db.delete(projectItems).where(eq(projectItems.id, id));
    await writeAudit({
      actor: ctx.user, action: "epic.deleted", entityType: "project_item",
      entityId: id, requestId: request.headers.get("cf-ray"), before, db: ctx.db,
    });

    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function positiveInteger(value: unknown) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
function finiteNumber(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; }
function assertSameOrigin(request: Request) { const origin = request.headers.get("origin"); if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Origem da requisição não autorizada."); }
