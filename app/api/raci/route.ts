import { eq, and, desc } from "drizzle-orm";
import { raciAssignments, users } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

const VALID_RACI_ROLES = ["responsible", "accountable", "consulted", "informed"];

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType") ?? "";
    const entityId = Number(url.searchParams.get("entityId"));

    if (!entityType || !entityId) throw new HttpError(400, "entityType e entityId são obrigatórios.");

    const assignments = await ctx.db
      .select({
        id: raciAssignments.id,
        entityType: raciAssignments.entityType,
        entityId: raciAssignments.entityId,
        userId: raciAssignments.userId,
        raciRole: raciAssignments.raciRole,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(raciAssignments)
      .leftJoin(users, eq(raciAssignments.userId, users.id))
      .where(and(eq(raciAssignments.entityType, entityType), eq(raciAssignments.entityId, entityId)));

    const matrix: Record<string, { userId: string; userName: string | null; roles: string[] }> = {};
    for (const a of assignments) {
      if (!matrix[a.userId]) matrix[a.userId] = { userId: a.userId, userName: a.userName, roles: [] };
      matrix[a.userId].roles.push(a.raciRole);
    }

    return Response.json({ assignments, matrix: Object.values(matrix), validRoles: VALID_RACI_ROLES });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director", "project_analyst"]);

    const body = await request.json() as Record<string, unknown>;
    const entityType = String(body.entityType ?? "").trim();
    const entityId = Number(body.entityId);
    const userId = String(body.userId ?? "").trim();
    const raciRole = String(body.raciRole ?? "").trim().toLowerCase();

    if (!entityType || !entityId || !userId) throw new HttpError(400, "entityType, entityId e userId são obrigatórios.");
    if (!VALID_RACI_ROLES.includes(raciRole)) throw new HttpError(400, `Papel RACI inválido. Use: ${VALID_RACI_ROLES.join(", ")}`);

    const [created] = await ctx.db.insert(raciAssignments).values({
      entityType, entityId, userId, raciRole,
    }).returning();

    return Response.json({ assignment: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director", "project_analyst"]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!id) throw new HttpError(400, "ID é obrigatório.");

    await ctx.db.delete(raciAssignments).where(eq(raciAssignments.id, id));
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
