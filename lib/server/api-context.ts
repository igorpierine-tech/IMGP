import { eq, and } from "drizzle-orm";
import { getDb, getMasterDb } from "../../db";
import { tenantUsers } from "../../db/master-schema";
import {
  requireApiUser,
  loadUserPermissions,
  requirePermission,
  requireRole,
  type CurrentUser,
  type AppRole,
} from "./authz";
import { extractTenantSlug, getTenantContext, type TenantContext } from "./tenant-context";
import { checkRateLimit, rateLimitKey } from "./rate-limit";
import { HttpError } from "./errors";
import type { Permission } from "./modules";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

export type ApiContext = {
  user: CurrentUser;
  db: DrizzleD1Database<typeof schema>;
  tenantCtx: TenantContext | null;
};

async function verifyTenantMembership(user: CurrentUser, tenantId: string): Promise<void> {
  const masterDb = getMasterDb();
  const [membership] = await masterDb
    .select({ id: tenantUsers.id })
    .from(tenantUsers)
    .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.email, user.email), eq(tenantUsers.active, true)))
    .limit(1);

  if (!membership) {
    throw new HttpError(403, "Usuário não pertence a este workspace.");
  }
}

function verifyOrigin(request: Request): void {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestHost = new URL(request.url).host;
  const originHost = new URL(origin).host;
  if (originHost !== requestHost) {
    throw new HttpError(403, "Requisição cross-origin não permitida.");
  }
}

export async function getApiContext(request: Request): Promise<ApiContext> {
  verifyOrigin(request);

  const slug = extractTenantSlug(request);
  const rlKey = rateLimitKey(request, slug);
  const rl = checkRateLimit(rlKey);
  if (!rl.allowed) {
    throw new HttpError(429, "Limite de requisições excedido. Tente novamente em breve.");
  }

  const user = await requireApiUser(request);

  if (slug) {
    const tenantCtx = await getTenantContext(request);
    await verifyTenantMembership(user, tenantCtx.tenant.id);
    const enrichedUser = await loadUserPermissions(user, tenantCtx);
    return { user: enrichedUser, db: tenantCtx.db, tenantCtx };
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
