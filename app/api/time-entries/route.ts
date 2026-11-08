import { and, desc, eq } from "drizzle-orm";
import { projectItems, timeEntries } from "@/db/schema";
import { writeAudit } from "@/lib/server/audit";
import { HttpError } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const rows = await ctx.db.select().from(timeEntries).where(eq(timeEntries.userId, ctx.user.id)).orderBy(desc(timeEntries.startedAt)).limit(100);
    return Response.json({ entries: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "time_tracking:create", ["project_coordinator", "it_director", "project_analyst", "keyuser"]);
    const body = await request.json() as { action?: string; itemId?: number; activity?: string };
    if (!Number.isInteger(body.itemId)) throw new HttpError(400, "A tarefa é obrigatória.");
    const item = await ctx.db.select().from(projectItems).where(eq(projectItems.id, body.itemId!)).limit(1);
    if (!item[0]) throw new HttpError(404, "Tarefa não encontrada.");

    if (body.action === "start") {
      const open = await ctx.db.select().from(timeEntries).where(and(eq(timeEntries.userId, ctx.user.id), eq(timeEntries.status, "running"))).limit(1);
      if (open[0]) throw new HttpError(409, "Já existe uma atividade em andamento para este técnico.");
      const [entry] = await ctx.db.insert(timeEntries).values({ projectId: item[0].projectId, itemId: item[0].id, userId: ctx.user.id, activity: body.activity?.trim() || item[0].name, startedAt: new Date(), status: "running" }).returning();
      await writeAudit({ actor: ctx.user, action: "time.started", entityType: "time_entry", entityId: entry.id, requestId: request.headers.get("cf-ray"), after: entry, db: ctx.db });
      return Response.json({ entry }, { status: 201 });
    }

    const open = await ctx.db.select().from(timeEntries).where(and(eq(timeEntries.userId, ctx.user.id), eq(timeEntries.itemId, body.itemId!), eq(timeEntries.status, "running"))).orderBy(desc(timeEntries.startedAt)).limit(1);
    if (!open[0]) throw new HttpError(409, "Não existe apontamento em andamento para esta tarefa.");
    const endedAt = new Date();
    const totalMinutes = Math.max(0, Math.round((endedAt.getTime() - open[0].startedAt.getTime() - open[0].pausedSeconds * 1000) / 60000));
    const status = body.action === "pause" ? "paused" : body.action === "close" ? "closed" : null;
    if (!status) throw new HttpError(400, "Ação inválida. Use start, pause ou close.");
    const [entry] = await ctx.db.update(timeEntries).set({ status, endedAt, totalMinutes }).where(eq(timeEntries.id, open[0].id)).returning();
    await writeAudit({ actor: ctx.user, action: `time.${status}`, entityType: "time_entry", entityId: entry.id, requestId: request.headers.get("cf-ray"), before: open[0], after: entry, db: ctx.db });
    return Response.json({ entry });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
