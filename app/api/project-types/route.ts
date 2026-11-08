import { asc, eq } from "drizzle-orm";
import { projectTypes } from "@/db/schema";
import { writeAudit } from "@/lib/server/audit";
import { HttpError } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";

const managerRoles = ["project_coordinator", "it_director"] as const;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const rows = await ctx.db.select().from(projectTypes).orderBy(asc(projectTypes.sequence), asc(projectTypes.name));
    return Response.json({ projectTypes: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "project_types:create", managerRoles);
    const body = await request.json() as Record<string, unknown>;
    const name = text(body.name);
    if (!name) throw new HttpError(400, "Informe o nome do tipo de projeto.");
    const [created] = await ctx.db.insert(projectTypes).values({
      name,
      description: text(body.description) || null,
      sequence: Number.isInteger(Number(body.sequence)) ? Number(body.sequence) : 999,
      active: body.active !== false,
      createdBy: ctx.user.id,
    }).returning();
    await writeAudit({ actor: ctx.user, action: "project_type.created", entityType: "project_type", entityId: created.id, requestId: request.headers.get("cf-ray"), after: created, db: ctx.db });
    return Response.json({ projectType: created }, { status: 201 });
  } catch (error) {
    const message = String(error).toLowerCase().includes("unique") ? "Já existe um tipo de projeto com esse nome." : errorMessage(error);
    return Response.json({ error: message }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "project_types:update", managerRoles);
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id), name = text(body.name);
    if (!Number.isInteger(id) || id <= 0 || !name) throw new HttpError(400, "Tipo de projeto inválido.");
    const before = await ctx.db.select().from(projectTypes).where(eq(projectTypes.id, id)).limit(1);
    if (!before[0]) throw new HttpError(404, "Tipo de projeto não encontrado.");
    const [updated] = await ctx.db.update(projectTypes).set({
      name,
      description: text(body.description) || null,
      sequence: Number.isInteger(Number(body.sequence)) ? Number(body.sequence) : before[0].sequence,
      active: body.active !== false,
      updatedAt: new Date(),
    }).where(eq(projectTypes.id, id)).returning();
    await writeAudit({ actor: ctx.user, action: "project_type.updated", entityType: "project_type", entityId: id, requestId: request.headers.get("cf-ray"), before: before[0], after: updated, db: ctx.db });
    return Response.json({ projectType: updated });
  } catch (error) {
    const message = String(error).toLowerCase().includes("unique") ? "Já existe um tipo de projeto com esse nome." : errorMessage(error);
    return Response.json({ error: message }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
