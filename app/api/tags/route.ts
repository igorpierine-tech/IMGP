import { eq, and, desc } from "drizzle-orm";
import { tags, entityTags } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType");
    const entityId = Number(url.searchParams.get("entityId"));

    if (entityType && entityId) {
      const assigned = await ctx.db
        .select({ tagId: entityTags.tagId, tagName: tags.name, tagColor: tags.color })
        .from(entityTags)
        .innerJoin(tags, eq(entityTags.tagId, tags.id))
        .where(and(eq(entityTags.entityType, entityType), eq(entityTags.entityId, entityId)));
      return Response.json({ tags: assigned });
    }

    const all = await ctx.db.select().from(tags).orderBy(tags.name);
    return Response.json({ tags: all });
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
    const action = String(body.action ?? "create");

    if (action === "create") {
      const name = String(body.name ?? "").trim();
      const color = String(body.color ?? "#6b7280").trim();
      if (!name) throw new HttpError(400, "Nome da tag é obrigatório.");
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new HttpError(400, "Cor inválida (use formato #RRGGBB).");

      const [tag] = await ctx.db.insert(tags).values({
        name,
        color,
        description: typeof body.description === "string" ? body.description.trim() : null,
        createdBy: ctx.user.id,
      }).returning();

      return Response.json({ tag }, { status: 201 });
    }

    if (action === "assign") {
      const tagId = Number(body.tagId);
      const entityType = String(body.entityType ?? "");
      const entityId = Number(body.entityId);

      if (!tagId || !entityType || !entityId) throw new HttpError(400, "tagId, entityType e entityId são obrigatórios.");

      const [tag] = await ctx.db.select().from(tags).where(eq(tags.id, tagId)).limit(1);
      if (!tag) throw new HttpError(404, "Tag não encontrada.");

      const [link] = await ctx.db.insert(entityTags).values({
        tagId, entityType, entityId, createdBy: ctx.user.id,
      }).returning();

      return Response.json({ entityTag: link }, { status: 201 });
    }

    if (action === "unassign") {
      const tagId = Number(body.tagId);
      const entityType = String(body.entityType ?? "");
      const entityId = Number(body.entityId);

      if (!tagId || !entityType || !entityId) throw new HttpError(400, "tagId, entityType e entityId são obrigatórios.");

      await ctx.db
        .delete(entityTags)
        .where(and(eq(entityTags.tagId, tagId), eq(entityTags.entityType, entityType), eq(entityTags.entityId, entityId)));

      return Response.json({ removed: true });
    }

    throw new HttpError(400, "Ação inválida. Use 'create', 'assign' ou 'unassign'.");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:delete", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID inválido.");

    await ctx.db.delete(entityTags).where(eq(entityTags.tagId, id));
    await ctx.db.delete(tags).where(eq(tags.id, id));
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
