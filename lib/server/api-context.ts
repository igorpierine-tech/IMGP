import { getDb } from "../../db";
import {
  requireApiUser,
  loadUserPermissions,
  requirePermission,
  requireRole,
  type CurrentUser,
  type AppRole,
} from "./authz";
import { extractTenantSlug, getTenantContext, type TenantContext } from "./tenant-context";
import type { Permission } from "./modules";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

export type ApiContext = {
  user: CurrentUser;
  db: DrizzleD1Database<typeof schema>;
  tenantCtx: TenantContext | null;
};

export async function getApiContext(request: Request): Promise<ApiContext> {
  const user = await requireApiUser(request);
  const slug = extractTenantSlug(request);

  if (slug) {
    try {
      const tenantCtx = await getTenantContext(request);
      const enrichedUser = await loadUserPermissions(user, tenantCtx);
      return { user: enrichedUser, db: tenantCtx.db, tenantCtx };
    } catch {
      return { user, db: getDb(), tenantCtx: null };
    }
  }

  return { user, db: getDb(), tenantCtx: null };
}

export function checkPermission(ctx: ApiContext, permission: Permission): void {
  if (ctx.tenantCtx) {
    requirePermission(ctx.user, permission);
  }
}

export function checkRole(ctx: ApiContext, allowed: readonly AppRole[]): void {
  requireRole(ctx.user, allowed);
}

export function checkPermissionOrRole(
  ctx: ApiContext,
  permission: Permission,
  fallbackRoles: readonly AppRole[],
): void {
  if (ctx.tenantCtx && ctx.user.permissions) {
    requirePermission(ctx.user, permission);
  } else {
    requireRole(ctx.user, fallbackRoles);
  }
}
