import { eq } from "drizzle-orm";
import { projectItems, projectPhases, projects, sprints } from "@/db/schema";
import { HttpError } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { writeAudit } from "@/lib/server/audit";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";

const editors = ["project_coordinator", "it_director", "project_analyst"] as const;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", editors);
    const body = await request.json() as Record<string, unknown>;
    const values = await validatedValues(body, undefined, ctx.db);
    const [created] = await ctx.db.insert(projectItems).values({ ...values, source: "platform" }).returning();
    await writeAudit({ actor: ctx.user, action: "project_item.created", entityType: "project_item", entityId: created.id, requestId: request.headers.get("cf-ray"), after: created, db: ctx.db });
    return Response.json({ item: created }, { status: 201 });
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
    if (!id) throw new HttpError(400, "Tarefa ou marco não informado.");
    const [before] = await ctx.db.select().from(projectItems).where(eq(projectItems.id, id)).limit(1);
    if (!before) throw new HttpError(404, "Tarefa ou marco não encontrado.");
    const values = await validatedValues(body, before.projectId, ctx.db);
    if (body.kind === undefined) values.kind = before.kind;
    const [updated] = await ctx.db.update(projectItems).set({ ...values, updatedAt: new Date() }).where(eq(projectItems.id, id)).returning();
    await writeAudit({ actor: ctx.user, action: "project_item.updated", entityType: "project_item", entityId: id, requestId: request.headers.get("cf-ray"), before, after: updated, db: ctx.db });
    return Response.json({ item: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:delete", editors);
    const body = await request.json() as Record<string, unknown>;
    const id = positiveInteger(body.id);
    if (!id) throw new HttpError(400, "Tarefa ou marco não informado.");
    const [before] = await ctx.db.select().from(projectItems).where(eq(projectItems.id, id)).limit(1);
    if (!before) throw new HttpError(404, "Tarefa ou marco não encontrado.");
    await ctx.db.delete(projectItems).where(eq(projectItems.id, id));
    await writeAudit({ actor: ctx.user, action: "project_item.deleted", entityType: "project_item", entityId: id, requestId: request.headers.get("cf-ray"), before, db: ctx.db });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validatedValues(body: Record<string, unknown>, fallbackProjectId: number | undefined, db: any) {
  const projectId = positiveInteger(body.projectId) || fallbackProjectId;
  const name = clean(body.name, 250);
  const kind: "epic" | "task" | "milestone" | "subtask" = body.kind === "epic" || body.kind === "milestone" || body.kind === "subtask" ? body.kind : "task";
  if (!projectId || !name) throw new HttpError(400, "Projeto e título são obrigatórios.");
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new HttpError(404, "Projeto não encontrado.");

  const phaseId = nullableInteger(body.phaseId);
  if (phaseId) {
    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, phaseId)).limit(1);
    const expectedRef = project.source === "external" ? `external:${project.externalId}` : `platform:${project.id}`;
    if (!phase || phase.projectRef !== expectedRef) throw new HttpError(400, "A fase selecionada não pertence ao projeto.");
  }
  const sprintId = nullableInteger(body.sprintId);
  if (sprintId) {
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, sprintId)).limit(1);
    if (!sprint || sprint.projectId !== projectId) throw new HttpError(400, "A sprint selecionada não pertence ao projeto.");
  }
  return {
    projectId,
    phaseId,
    sprintId,
    parentId: nullableInteger(body.parentId),
    kind,
    name,
    groupName: clean(body.groupName, 120) || null,
    status: clean(body.status, 80) || "planned",
    assignedName: clean(body.assignedName, 180) || null,
    plannedStart: clean(body.plannedStart, 10) || null,
    plannedEnd: clean(body.plannedEnd, 10) || null,
    actualStart: clean(body.actualStart, 10) || null,
    actualEnd: clean(body.actualEnd, 10) || null,
    plannedHours: finiteNumber(body.plannedHours),
    rawJson: JSON.stringify({ priority: clean(body.priority, 30) || "Média" }),
  };
}

function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function positiveInteger(value: unknown) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
function nullableInteger(value: unknown) { return value === null || value === "" || value === undefined ? null : positiveInteger(value); }
function finiteNumber(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; }
function assertSameOrigin(request: Request) { const origin = request.headers.get("origin"); if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Origem da requisição não autorizada."); }
