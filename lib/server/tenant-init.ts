import { env } from "cloudflare:workers";
import { getTenantDb } from "../../db";
import { seedDefaultRoles } from "./seed-tenant-roles";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

const RBAC_DDL = `
CREATE TABLE IF NOT EXISTS \`tenant_roles\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`key\` text NOT NULL,
  \`name\` text NOT NULL,
  \`description\` text,
  \`built_in\` integer DEFAULT false NOT NULL,
  \`active\` integer DEFAULT true NOT NULL,
  \`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  \`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS \`tenant_roles_key_unique\` ON \`tenant_roles\` (\`key\`);

CREATE TABLE IF NOT EXISTS \`role_permissions\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`role_id\` integer NOT NULL REFERENCES \`tenant_roles\`(\`id\`) ON DELETE cascade,
  \`module_key\` text NOT NULL,
  \`action\` text NOT NULL,
  \`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS \`role_permissions_unique_idx\` ON \`role_permissions\` (\`role_id\`, \`module_key\`, \`action\`);
CREATE INDEX IF NOT EXISTS \`role_permissions_role_idx\` ON \`role_permissions\` (\`role_id\`);
`;

function resolveTenantBinding(tenantId: string): D1Database {
  const bindingName = `TENANT_${tenantId.replace(/-/g, "_").toUpperCase()}`;
  const binding = (env as Record<string, unknown>)[bindingName] as D1Database | undefined;
  if (binding) return binding;

  if (!env.DB) {
    throw new Error("Nenhum banco de dados disponível para o tenant.");
  }
  return env.DB;
}

export async function initializeTenantDb(
  tenantId: string,
): Promise<DrizzleD1Database<typeof schema>> {
  const binding = resolveTenantBinding(tenantId);
  await binding.exec(RBAC_DDL);
  const db = getTenantDb(binding);
  await seedDefaultRoles(db);
  return db;
}
