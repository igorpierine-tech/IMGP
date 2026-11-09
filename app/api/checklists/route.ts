import { eq, and, desc, count, sql } from "drizzle-orm";
import { checklistItems, projectItems } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const itemId = Number(url.searchParams.get("itemId"));
    if (!itemId) throw new HttpError(400, "itemId é obrigatório.");

    const items = await ctx.db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.itemId, itemId))
      .orderBy(checklistItems.sequence);

    const total = items.length;
    const checked = items.filter(i => i.checked).length;
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

    return Response.json({ checklist: items, progress, total, checked });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", [
      "project_coordinator", "it_director", "project_analyst", "keyuser",
    ]);

    const body = await request.json() as Record<string, unknown>;
    const itemId = Number(body.itemId);
    const title = String(body.title ?? "").trim();
    if (!itemId) throw new HttpError(400, "itemId é obrigatório.");
    if (!title) throw new HttpError(400, "Título é obrigatório.");

    const [item] = await ctx.db.select({ id: projectItems.id }).from(projectItems).where(eq(projectItems.id, itemId)).limit(1);
    if (!item) throw new HttpError(404, "Tarefa não encontrada.");

    const existingCount = await ctx.db.select({ c: count() }).from(checklistItems).where(eq(checklistItems.itemId, itemId));
    const sequence = (existingCount[0]?.c ?? 0);

    const [created] = await ctx.db.insert(checklistItems).values({
      itemId,
      title,
      sequence,
      assignedUserId: typeof body.assignedUserId === "string" ? body.assignedUserId : null,
      dueDate: typeof body.dueDate === "string" ? body.dueDate : null,
    }).returning();

    return Response.json({ item: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", [
      "project_coordinator", "it_director", "project_analyst", "keyuser",
    ]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!id) throw new HttpError(400, "ID é obrigatório.");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.checked === "boolean") updates.checked = body.checked;
    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.sequence === "number") updates.sequence = body.sequence;

    const [updated] = await ctx.db.update(checklistItems).set(updates).where(eq(checklistItems.id, id)).returning();
    if (!updated) throw new HttpError(404, "Item não encontrado.");

    return Response.json({ item: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", [
      "project_coordinator", "it_director", "project_analyst",
    ]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!id) throw new HttpError(400, "ID é obrigatório.");

    await ctx.db.delete(checklistItems).where(eq(checklistItems.id, id));
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
