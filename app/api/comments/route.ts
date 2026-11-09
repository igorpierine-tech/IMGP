import { desc, eq, and } from "drizzle-orm";
import { comments, users } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { createNotifications } from "@/lib/server/notify";

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

function extractMentions(body: string): { name: string; userId: string }[] {
  const mentions: { name: string; userId: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(body)) !== null) {
    mentions.push({ name: m[1], userId: m[2] });
  }
  return mentions;
}

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType");
    const entityId = Number(url.searchParams.get("entityId"));
    if (!entityType || !Number.isInteger(entityId)) {
      throw new HttpError(400, "entityType e entityId são obrigatórios.");
    }

    const rows = await ctx.db
      .select({
        id: comments.id,
        entityType: comments.entityType,
        entityId: comments.entityId,
        parentId: comments.parentId,
        userId: comments.userId,
        displayName: users.displayName,
        body: comments.body,
        mentionsJson: comments.mentionsJson,
        editedAt: comments.editedAt,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(and(eq(comments.entityType, entityType), eq(comments.entityId, entityId)))
      .orderBy(desc(comments.createdAt))
      .limit(200);

    return Response.json({ comments: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const body = await request.json() as Record<string, unknown>;
    const entityType = typeof body.entityType === "string" ? body.entityType : "";
    const entityId = Number(body.entityId);
    const parentId = body.parentId ? Number(body.parentId) : null;
    const text = typeof body.body === "string" ? body.body.trim() : "";

    if (!entityType || !Number.isInteger(entityId) || entityId <= 0) {
      throw new HttpError(400, "entityType e entityId são obrigatórios.");
    }
    if (!text) throw new HttpError(400, "O comentário não pode estar vazio.");

    const mentions = extractMentions(text);
    const [created] = await ctx.db.insert(comments).values({
      entityType,
      entityId,
      parentId,
      userId: ctx.user.id,
      body: text,
      mentionsJson: mentions.length > 0 ? JSON.stringify(mentions) : null,
    }).returning();

    if (mentions.length > 0) {
      await createNotifications(
        ctx.db,
        mentions.map((m) => ({
          userId: m.userId,
          type: "mention",
          title: `${ctx.user.displayName} mencionou você em um comentário`,
          body: text.slice(0, 200),
          entityType,
          entityId: String(entityId),
        })),
      );
    }

    return Response.json({ comment: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    const text = typeof body.body === "string" ? body.body.trim() : "";

    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID do comentário é obrigatório.");
    if (!text) throw new HttpError(400, "O comentário não pode estar vazio.");

    const [existing] = await ctx.db.select().from(comments).where(eq(comments.id, id)).limit(1);
    if (!existing) throw new HttpError(404, "Comentário não encontrado.");
    if (existing.userId !== ctx.user.id) throw new HttpError(403, "Você só pode editar seus próprios comentários.");

    const mentions = extractMentions(text);
    const [updated] = await ctx.db.update(comments).set({
      body: text,
      mentionsJson: mentions.length > 0 ? JSON.stringify(mentions) : null,
      editedAt: new Date(),
    }).where(eq(comments.id, id)).returning();

    return Response.json({ comment: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID é obrigatório.");

    const [existing] = await ctx.db.select().from(comments).where(eq(comments.id, id)).limit(1);
    if (!existing) throw new HttpError(404, "Comentário não encontrado.");
    if (existing.userId !== ctx.user.id && !["project_coordinator", "it_director"].includes(ctx.user.role)) {
      throw new HttpError(403, "Sem permissão para excluir este comentário.");
    }

    await ctx.db.delete(comments).where(eq(comments.id, id));
    return Response.json({ message: "Comentário excluído." });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
