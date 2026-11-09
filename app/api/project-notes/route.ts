import { eq, and, desc } from "drizzle-orm";
import { projectNotes, projects } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const noteId = Number(url.searchParams.get("id"));
    const projectId = Number(url.searchParams.get("projectId"));

    if (noteId) {
      const [note] = await ctx.db.select().from(projectNotes).where(eq(projectNotes.id, noteId)).limit(1);
      if (!note) throw new HttpError(404, "Nota não encontrada.");
      return Response.json({ note });
    }

    if (!projectId) throw new HttpError(400, "projectId é obrigatório.");

    const notes = await ctx.db.select().from(projectNotes)
      .where(eq(projectNotes.projectId, projectId))
      .orderBy(desc(projectNotes.updatedAt));

    return Response.json({ notes });
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
    const projectId = Number(body.projectId);
    const title = String(body.title ?? "").trim();
    const content = String(body.content ?? "");

    if (!projectId || !title) throw new HttpError(400, "projectId e title são obrigatórios.");

    const [proj] = await ctx.db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!proj) throw new HttpError(404, "Projeto não encontrado.");

    const [note] = await ctx.db.insert(projectNotes).values({
      projectId,
      title,
      content,
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
    }).returning();

    await writeAudit({ actor: ctx.user, action: "project_note.created", entityType: "project_note", entityId: note.id, requestId: request.headers.get("cf-ray"), after: { projectId, title } });
    return Response.json({ note }, { status: 201 });
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

    const [existing] = await ctx.db.select().from(projectNotes).where(eq(projectNotes.id, id)).limit(1);
    if (!existing) throw new HttpError(404, "Nota não encontrada.");

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.user.id,
      version: existing.version + 1,
    };
    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.content === "string") updates.content = body.content;

    const [updated] = await ctx.db.update(projectNotes).set(updates).where(eq(projectNotes.id, id)).returning();
    return Response.json({ note: updated });
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
    if (!id) throw new HttpError(400, "ID é obrigatório.");

    await ctx.db.delete(projectNotes).where(eq(projectNotes.id, id));
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
