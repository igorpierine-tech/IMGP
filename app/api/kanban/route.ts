import { eq, desc } from "drizzle-orm";
import { projectItems, projects } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

const KANBAN_COLUMNS = ["planned", "in_progress", "blocked", "review", "done"] as const;

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:read", [
      "project_coordinator", "it_director", "project_analyst", "keyuser", "requester", "area_manager", "viewer",
    ]);

    const url = new URL(request.url);
    const projectId = Number(url.searchParams.get("projectId"));
    if (!projectId) throw new HttpError(400, "projectId é obrigatório.");

    const items = await ctx.db
      .select()
      .from(projectItems)
      .where(eq(projectItems.projectId, projectId))
      .orderBy(desc(projectItems.updatedAt));

    const columns: Record<string, typeof items> = {};
    for (const col of KANBAN_COLUMNS) columns[col] = [];
    for (const item of items) {
      const col = KANBAN_COLUMNS.includes(item.status as typeof KANBAN_COLUMNS[number])
        ? item.status
        : "planned";
      (columns[col] ??= []).push(item);
    }

    return Response.json({ columns, total: items.length });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director", "project_analyst"]);

    const body = await request.json() as Record<string, unknown>;
    const itemId = Number(body.itemId);
    const newStatus = String(body.status ?? "");

    if (!Number.isInteger(itemId) || itemId <= 0) throw new HttpError(400, "Item inválido.");
    if (!KANBAN_COLUMNS.includes(newStatus as typeof KANBAN_COLUMNS[number])) {
      throw new HttpError(400, `Status inválido. Use: ${KANBAN_COLUMNS.join(", ")}`);
    }

    const [before] = await ctx.db.select().from(projectItems).where(eq(projectItems.id, itemId)).limit(1);
    if (!before) throw new HttpError(404, "Item não encontrado.");

    const [updated] = await ctx.db
      .update(projectItems)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(projectItems.id, itemId))
      .returning();

    await writeAudit({
      actor: ctx.user,
      action: "item.status_changed",
      entityType: "project_item",
      entityId: itemId,
      requestId: request.headers.get("cf-ray"),
      before: { status: before.status },
      after: { status: newStatus },
    });

    return Response.json({ item: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
