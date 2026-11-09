import { eq, desc } from "drizzle-orm";
import { objectives, keyResults } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const objectiveId = Number(url.searchParams.get("id"));

    if (objectiveId) {
      const [obj] = await ctx.db.select().from(objectives).where(eq(objectives.id, objectiveId)).limit(1);
      if (!obj) throw new HttpError(404, "Objetivo não encontrado.");
      const krs = await ctx.db.select().from(keyResults).where(eq(keyResults.objectiveId, objectiveId));
      return Response.json({ objective: obj, keyResults: krs });
    }

    const all = await ctx.db.select().from(objectives).orderBy(desc(objectives.updatedAt));
    return Response.json({ objectives: all });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", ["project_coordinator", "it_director", "project_analyst"]);

    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "create_objective");

    if (action === "create_objective") {
      const title = String(body.title ?? "").trim();
      if (!title) throw new HttpError(400, "Título é obrigatório.");

      const [obj] = await ctx.db.insert(objectives).values({
        title,
        description: typeof body.description === "string" ? body.description.trim() : null,
        ownerUserId: typeof body.ownerUserId === "string" ? body.ownerUserId : null,
        period: typeof body.period === "string" ? body.period.trim() : null,
        parentId: typeof body.parentId === "number" ? body.parentId : null,
        createdBy: ctx.user.id,
      }).returning();

      await writeAudit({ actor: ctx.user, action: "objective.created", entityType: "objective", entityId: obj.id, requestId: request.headers.get("cf-ray"), after: obj });
      return Response.json({ objective: obj }, { status: 201 });
    }

    if (action === "create_key_result") {
      const objectiveId = Number(body.objectiveId);
      const title = String(body.title ?? "").trim();
      if (!objectiveId || !title) throw new HttpError(400, "objectiveId e título são obrigatórios.");

      const [kr] = await ctx.db.insert(keyResults).values({
        objectiveId,
        title,
        metricType: String(body.metricType ?? "percentage"),
        targetValue: typeof body.targetValue === "number" ? body.targetValue : 100,
        unit: typeof body.unit === "string" ? body.unit.trim() : null,
        linkedProjectId: typeof body.linkedProjectId === "number" ? body.linkedProjectId : null,
      }).returning();

      return Response.json({ keyResult: kr }, { status: 201 });
    }

    throw new HttpError(400, "Ação inválida.");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director", "project_analyst"]);

    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "update_objective");

    if (action === "update_key_result") {
      const id = Number(body.id);
      if (!id) throw new HttpError(400, "ID é obrigatório.");
      const currentValue = typeof body.currentValue === "number" ? body.currentValue : undefined;
      if (currentValue === undefined) throw new HttpError(400, "currentValue é obrigatório.");

      const [updated] = await ctx.db.update(keyResults).set({ currentValue, updatedAt: new Date() }).where(eq(keyResults.id, id)).returning();
      if (!updated) throw new HttpError(404, "Key Result não encontrado.");

      const krs = await ctx.db.select().from(keyResults).where(eq(keyResults.objectiveId, updated.objectiveId));
      const avgProgress = krs.length > 0
        ? Math.round(krs.reduce((sum, kr) => sum + Math.min(100, (kr.currentValue / kr.targetValue) * 100), 0) / krs.length)
        : 0;

      await ctx.db.update(objectives).set({ progress: avgProgress, updatedAt: new Date() }).where(eq(objectives.id, updated.objectiveId));
      return Response.json({ keyResult: updated, objectiveProgress: avgProgress });
    }

    const id = Number(body.id);
    if (!id) throw new HttpError(400, "ID é obrigatório.");
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.status === "string") updates.status = body.status;
    if (typeof body.description === "string") updates.description = body.description.trim();

    const [updated] = await ctx.db.update(objectives).set(updates).where(eq(objectives.id, id)).returning();
    if (!updated) throw new HttpError(404, "Objetivo não encontrado.");
    return Response.json({ objective: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
