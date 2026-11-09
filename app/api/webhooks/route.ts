import { desc, eq } from "drizzle-orm";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { getApiContext, checkRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkRole(ctx, ["project_coordinator", "it_director"]);
    const url = new URL(request.url);
    const webhookId = Number(url.searchParams.get("webhookId"));

    if (webhookId) {
      const deliveries = await ctx.db
        .select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.webhookId, webhookId))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(50);
      return Response.json({ deliveries });
    }

    const rows = await ctx.db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
    return Response.json({ webhooks: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkRole(ctx, ["project_coordinator", "it_director"]);
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const events = Array.isArray(body.events) ? body.events : [];

    if (!name) throw new HttpError(400, "Nome do webhook é obrigatório.");
    if (!url) throw new HttpError(400, "URL do webhook é obrigatória.");

    try { new URL(url); } catch { throw new HttpError(400, "URL inválida."); }

    const secretBytes = new Uint8Array(32);
    crypto.getRandomValues(secretBytes);
    const secret = Array.from(secretBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

    const [created] = await ctx.db.insert(webhooks).values({
      name,
      url,
      secret,
      eventsJson: JSON.stringify(events),
      createdBy: ctx.user.id,
    }).returning();

    return Response.json({ webhook: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkRole(ctx, ["project_coordinator", "it_director"]);
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID do webhook é obrigatório.");

    const [existing] = await ctx.db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (!existing) throw new HttpError(404, "Webhook não encontrado.");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.url === "string") {
      try { new URL(body.url as string); } catch { throw new HttpError(400, "URL inválida."); }
      updates.url = (body.url as string).trim();
    }
    if (Array.isArray(body.events)) updates.eventsJson = JSON.stringify(body.events);
    if (typeof body.active === "boolean") {
      updates.active = body.active;
      if (body.active) updates.failureCount = 0;
    }

    const [updated] = await ctx.db.update(webhooks).set(updates).where(eq(webhooks.id, id)).returning();
    return Response.json({ webhook: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkRole(ctx, ["project_coordinator", "it_director"]);
    const reqUrl = new URL(request.url);
    const id = Number(reqUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID é obrigatório.");

    await ctx.db.delete(webhookDeliveries).where(eq(webhookDeliveries.webhookId, id));
    await ctx.db.delete(webhooks).where(eq(webhooks.id, id));
    return Response.json({ message: "Webhook excluído." });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
