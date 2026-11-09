import { eq, and, desc } from "drizzle-orm";
import { favorites } from "@/db/schema";
import { getApiContext } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);

    const userFavorites = await ctx.db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, ctx.user.id))
      .orderBy(desc(favorites.createdAt));

    return Response.json({ favorites: userFavorites });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);

    const body = await request.json() as Record<string, unknown>;
    const entityType = String(body.entityType ?? "").trim();
    const entityId = Number(body.entityId);

    if (!entityType) throw new HttpError(400, "entityType é obrigatório.");
    if (!["project", "demand", "task", "sprint"].includes(entityType)) {
      throw new HttpError(400, "entityType deve ser: project, demand, task ou sprint.");
    }
    if (!Number.isInteger(entityId) || entityId <= 0) throw new HttpError(400, "entityId inválido.");

    const [existing] = await ctx.db
      .select()
      .from(favorites)
      .where(and(
        eq(favorites.userId, ctx.user.id),
        eq(favorites.entityType, entityType),
        eq(favorites.entityId, entityId),
      ))
      .limit(1);

    if (existing) {
      return Response.json({ favorite: existing, message: "Já está nos favoritos." });
    }

    const [created] = await ctx.db.insert(favorites).values({
      userId: ctx.user.id,
      entityType,
      entityId,
    }).returning();

    return Response.json({ favorite: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);

    const body = await request.json() as Record<string, unknown>;
    const entityType = String(body.entityType ?? "").trim();
    const entityId = Number(body.entityId);

    if (!entityType || !entityId) throw new HttpError(400, "entityType e entityId são obrigatórios.");

    await ctx.db
      .delete(favorites)
      .where(and(
        eq(favorites.userId, ctx.user.id),
        eq(favorites.entityType, entityType),
        eq(favorites.entityId, entityId),
      ));

    return Response.json({ removed: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
