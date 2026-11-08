import { asc, eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { AppRole, HttpError, roles } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { hashPassword, normalizeEmail, validatePassword } from "@/lib/server/password-auth";
import { writeAudit } from "@/lib/server/audit";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";

const managers = ["project_coordinator", "it_director"] as const;

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "users:read", managers);
    const rows = await ctx.db.select({
      id: users.id, email: users.email, displayName: users.displayName, role: users.role,
      active: users.active, mustChangePassword: users.mustChangePassword, lastSeenAt: users.lastSeenAt,
    }).from(users).orderBy(asc(users.displayName));
    return Response.json({ users: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "users:create", managers);
    const body = await request.json() as Record<string, unknown>;
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const role = roles.includes(body.role as AppRole) ? body.role as AppRole : "keyuser";
    if (!displayName || !email) throw new HttpError(400, "Nome e e-mail são obrigatórios.");
    const passwordError = validatePassword(password);
    if (passwordError) throw new HttpError(400, passwordError);
    const existing = await ctx.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) throw new HttpError(409, "Já existe um usuário com este e-mail.");
    const passwordData = await hashPassword(password);
    const [created] = await ctx.db.insert(users).values({
      id: `local:${crypto.randomUUID()}`, email, displayName, role, active: true,
      passwordHash: passwordData.hash, passwordSalt: passwordData.salt,
      passwordIterations: passwordData.iterations, passwordSetAt: new Date(),
      mustChangePassword: true, invitedBy: ctx.user.id,
    }).returning({ id: users.id, email: users.email, displayName: users.displayName, role: users.role, active: users.active, mustChangePassword: users.mustChangePassword });
    await writeAudit({ actor: ctx.user, action: "user.created", entityType: "user", entityId: created.id, requestId: request.headers.get("cf-ray"), after: created, db: ctx.db });
    return Response.json({ user: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "users:update", managers);
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) throw new HttpError(400, "Usuário não informado.");
    const update: Partial<typeof users.$inferInsert> = {};
    if (typeof body.active === "boolean") update.active = body.active;
    if (roles.includes(body.role as AppRole)) update.role = body.role as AppRole;
    if (typeof body.displayName === "string" && body.displayName.trim()) update.displayName = body.displayName.trim();
    if (typeof body.password === "string" && body.password) {
      const passwordError = validatePassword(body.password);
      if (passwordError) throw new HttpError(400, passwordError);
      const data = await hashPassword(body.password);
      Object.assign(update, { passwordHash: data.hash, passwordSalt: data.salt, passwordIterations: data.iterations, passwordSetAt: new Date(), mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null });
    }
    const [updated] = await ctx.db.update(users).set(update).where(eq(users.id, id)).returning({ id: users.id, email: users.email, displayName: users.displayName, role: users.role, active: users.active, mustChangePassword: users.mustChangePassword });
    if (!updated) throw new HttpError(404, "Usuário não encontrado.");
    await writeAudit({ actor: ctx.user, action: "user.updated", entityType: "user", entityId: id, requestId: request.headers.get("cf-ray"), after: updated, db: ctx.db });
    return Response.json({ user: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Origem da requisição não autorizada.");
}
