import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import * as masterSchema from "./master-schema";

export function getMasterDb() {
  if (!env.MASTER_DB) {
    throw new Error(
      "Cloudflare D1 binding `MASTER_DB` is unavailable. Configure the master database binding in your wrangler config."
    );
  }
  return drizzle(env.MASTER_DB, { schema: masterSchema });
}

export function getTenantDb(tenantDbBinding: D1Database) {
  return drizzle(tenantDbBinding, { schema });
}

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }
  return drizzle(env.DB, { schema });
}
