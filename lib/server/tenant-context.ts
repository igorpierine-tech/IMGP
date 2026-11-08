import { eq } from "drizzle-orm";
import { getMasterDb, getTenantDb } from "../../db";
import { tenants } from "../../db/master-schema";
import { HttpError } from "./errors";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

export type TenantInfo = {
  id: string;
  slug: string;
  name: string;
  status: string;
  planId: number | null;
  maxUsers: number;
};

export type TenantContext = {
  tenant: TenantInfo;
  db: DrizzleD1Database<typeof schema>;
};

const TENANT_HEADER = "x-tenant-slug";

export function extractTenantSlug(request: Request): string | null {
  const headerSlug = request.headers.get(TENANT_HEADER);
  if (headerSlug) return headerSlug;

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const baseIdx = pathParts.indexOf("Projetos");
  if (baseIdx >= 0 && pathParts[baseIdx + 1] === "t" && pathParts[baseIdx + 2]) {
    return pathParts[baseIdx + 2];
  }

  const subdomain = url.hostname.split(".")[0];
  if (subdomain && subdomain !== "www" && subdomain !== "localhost") {
    return subdomain;
  }

  return null;
}

export async function resolveTenant(slug: string): Promise<TenantInfo> {
  const masterDb = getMasterDb();
  const rows = await masterDb
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!rows[0]) {
    throw new HttpError(404, `Tenant "${slug}" não encontrado.`);
  }

  const tenant = rows[0];
  if (tenant.status === "cancelled") {
    throw new HttpError(403, "Este workspace foi cancelado.");
  }
  if (tenant.status === "suspended") {
    throw new HttpError(403, "Este workspace está suspenso. Contate o administrador.");
  }

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    planId: tenant.planId,
    maxUsers: tenant.maxUsers,
  };
}

export async function getTenantContext(request: Request): Promise<TenantContext> {
  const slug = extractTenantSlug(request);
  if (!slug) {
    throw new HttpError(400, "Tenant não identificado na requisição.");
  }

  const tenant = await resolveTenant(slug);
  const { env } = await import("cloudflare:workers") as { env: Cloudflare.Env };

  const bindingName = `TENANT_${tenant.id.replace(/-/g, "_").toUpperCase()}`;
  const tenantBinding = (env as Record<string, unknown>)[bindingName] as D1Database | undefined;

  if (!tenantBinding) {
    const defaultBinding = env.DB;
    if (!defaultBinding) {
      throw new HttpError(500, "Banco de dados do tenant não disponível.");
    }
    return { tenant, db: getTenantDb(defaultBinding) };
  }

  return { tenant, db: getTenantDb(tenantBinding) };
}
