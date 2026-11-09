import { desc, eq, and, sql } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { getApiContext } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "1";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    const conditions = [eq(notifications.userId, ctx.user.id)];
    if (unreadOnly) conditions.push(eq(notifications.read, false));

    const rows = await ctx.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const [{ total }] = await ctx.db
      .select({ total: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.read, false)));

    return Response.json({ notifications: rows, unreadCount: total });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const body = await request.json() as Record<string, unknown>;

    if (body.markAllRead === true) {
      await ctx.db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.read, false)));
      return Response.json({ message: "Todas as notificações marcadas como lidas." });
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID da notificação é obrigatório.");

    const [existing] = await ctx.db
      .select({ userId: notifications.userId })
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (!existing || existing.userId !== ctx.user.id) {
      throw new HttpError(404, "Notificação não encontrada.");
    }

    await ctx.db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(notifications.id, id));

    return Response.json({ message: "Notificação marcada como lida." });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
