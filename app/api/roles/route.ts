import { eq, desc, sql } from "drizzle-orm";
import { tenantRoles, rolePermissions, users } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { MODULE_KEYS, ACTIONS } from "@/lib/server/modules";
import type { Permission } from "@/lib/server/modules";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "users:read", ["project_coordinator", "it_director"]);

    const roles = await ctx.db.select().from(tenantRoles).orderBy(tenantRoles.name);
    const perms = await ctx.db.select().from(rolePermissions);

    const permsByRole = new Map<number, Permission[]>();
    for (const p of perms) {
      const list = permsByRole.get(p.roleId) ?? [];
      list.push(`${p.moduleKey}:${p.action}` as Permission);
      permsByRole.set(p.roleId, list);
    }

    const result = roles.map(r => ({
      ...r,
      permissions: permsByRole.get(r.id) ?? [],
    }));

    return Response.json({
      roles: result,
      availableModules: MODULE_KEYS,
      availableActions: ACTIONS,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "users:create", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const key = String(body.key ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const name = String(body.name ?? "").trim();
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const permissions = Array.isArray(body.permissions) ? body.permissions.filter((p): p is string => typeof p === "string") : [];

    if (!key || key.length < 2) throw new HttpError(400, "Chave do papel é obrigatória (mín. 2 caracteres).");
    if (!name) throw new HttpError(400, "Nome do papel é obrigatório.");

    const validPerms = permissions.filter(p => {
      const [mod, act] = p.split(":");
      return MODULE_KEYS.includes(mod as typeof MODULE_KEYS[number]) && ACTIONS.includes(act as typeof ACTIONS[number]);
    });

    const [role] = await ctx.db.insert(tenantRoles).values({
      key, name, description, builtIn: false,
    }).returning();

    if (validPerms.length > 0) {
      await ctx.db.insert(rolePermissions).values(
        validPerms.map(p => {
          const [moduleKey, action] = p.split(":");
          return { roleId: role.id, moduleKey, action };
        }),
      );
    }

    await writeAudit({
      actor: ctx.user,
      action: "role.created",
      entityType: "role",
      entityId: role.id,
      requestId: request.headers.get("cf-ray"),
      after: { ...role, permissions: validPerms },
    });

    return Response.json({ role: { ...role, permissions: validPerms } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "users:update", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID do papel inválido.");

    const [role] = await ctx.db.select().from(tenantRoles).where(eq(tenantRoles.id, id)).limit(1);
    if (!role) throw new HttpError(404, "Papel não encontrado.");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === "string") updates.description = body.description.trim();
    if (typeof body.active === "boolean") updates.active = body.active;

    const [updated] = await ctx.db.update(tenantRoles).set(updates).where(eq(tenantRoles.id, id)).returning();

    if (Array.isArray(body.permissions)) {
      const newPerms = body.permissions.filter((p): p is string => {
        if (typeof p !== "string") return false;
        const [mod, act] = p.split(":");
        return MODULE_KEYS.includes(mod as typeof MODULE_KEYS[number]) && ACTIONS.includes(act as typeof ACTIONS[number]);
      });

      await ctx.db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

      if (newPerms.length > 0) {
        await ctx.db.insert(rolePermissions).values(
          newPerms.map(p => {
            const [moduleKey, action] = p.split(":");
            return { roleId: id, moduleKey, action };
          }),
        );
      }
    }

    await writeAudit({
      actor: ctx.user,
      action: "role.updated",
      entityType: "role",
      entityId: id,
      requestId: request.headers.get("cf-ray"),
      before: role,
      after: updated,
    });

    return Response.json({ role: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "users:delete", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID do papel inválido.");

    const [role] = await ctx.db.select().from(tenantRoles).where(eq(tenantRoles.id, id)).limit(1);
    if (!role) throw new HttpError(404, "Papel não encontrado.");
    if (role.builtIn) throw new HttpError(400, "Papéis embutidos não podem ser excluídos.");

    const usersWithRole = await ctx.db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.role} = ${role.key}`)
      .limit(1);

    if (usersWithRole.length > 0) {
      throw new HttpError(400, "Não é possível excluir um papel que possui usuários atribuídos.");
    }

    await ctx.db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    await ctx.db.delete(tenantRoles).where(eq(tenantRoles.id, id));

    await writeAudit({
      actor: ctx.user,
      action: "role.deleted",
      entityType: "role",
      entityId: id,
      requestId: request.headers.get("cf-ray"),
      before: role,
    });

    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
