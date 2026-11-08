import { getDb } from "../../db";
import { auditEvents } from "../../db/schema";
import type { CurrentUser } from "./authz";

type AuditInput = {
  actor: CurrentUser;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  requestId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

function serialize(value: unknown) {
  return value === undefined ? null : JSON.stringify(value);
}

export async function writeAudit(input: AuditInput) {
  await getDb().insert(auditEvents).values({
    actorUserId: input.actor.id,
    actorEmail: input.actor.email,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    requestId: input.requestId ?? null,
    beforeJson: serialize(input.before),
    afterJson: serialize(input.after),
    metadataJson: serialize(input.metadata),
  });
}
