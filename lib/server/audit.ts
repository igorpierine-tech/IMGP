import { getDb } from "../../db";
import { auditEvents } from "../../db/schema";
import type { CurrentUser } from "./authz";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

type AuditInput = {
  actor: CurrentUser;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  requestId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  db?: DrizzleD1Database<typeof schema>;
};

function serialize(value: unknown) {
  return value === undefined ? null : JSON.stringify(value);
}

export async function writeAudit(input: AuditInput) {
  const db = input.db ?? getDb();
  const meta = input.actor.tenantId
    ? { ...(typeof input.metadata === "object" && input.metadata ? input.metadata : {}), tenantId: input.actor.tenantId }
    : input.metadata;

  await db.insert(auditEvents).values({
    actorUserId: input.actor.id,
    actorEmail: input.actor.email,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    requestId: input.requestId ?? null,
    beforeJson: serialize(input.before),
    afterJson: serialize(input.after),
    metadataJson: serialize(meta),
  });
}
