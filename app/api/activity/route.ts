import { desc, eq, and, gte, sql } from "drizzle-orm";
import { auditEvents, users } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "audit:read", ["project_coordinator", "it_director", "project_analyst"]);

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType");
    const entityId = url.searchParams.get("entityId");
    const userId = url.searchParams.get("userId");
    const days = Math.min(Number(url.searchParams.get("days")) || 30, 90);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Number(url.searchParams.get("offset")) || 0;

    const since = Date.now() - days * 86_400_000;
    const conditions = [gte(auditEvents.occurredAt, new Date(since))];

    if (entityType) conditions.push(eq(auditEvents.entityType, entityType));
    if (entityId) conditions.push(eq(auditEvents.entityId, entityId));
    if (userId) conditions.push(eq(auditEvents.actorUserId, userId));

    const events = await ctx.db
      .select({
        id: auditEvents.id,
        occurredAt: auditEvents.occurredAt,
        actorUserId: auditEvents.actorUserId,
        actorEmail: auditEvents.actorEmail,
        action: auditEvents.action,
        entityType: auditEvents.entityType,
        entityId: auditEvents.entityId,
        metadataJson: auditEvents.metadataJson,
      })
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(limit)
      .offset(offset);

    const actorIds = [...new Set(events.map(e => e.actorUserId).filter(Boolean))] as string[];
    const actorRows = actorIds.length > 0
      ? await ctx.db
          .select({ id: users.id, displayName: users.displayName, email: users.email })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(actorIds.map(id => sql`${id}`), sql`, `)})`)
      : [];

    const actorMap = new Map(actorRows.map(u => [u.id, u]));

    const feed = events.map(e => ({
      id: e.id,
      occurredAt: e.occurredAt,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      actor: e.actorUserId ? actorMap.get(e.actorUserId) ?? { id: e.actorUserId, displayName: e.actorEmail ?? "Sistema", email: e.actorEmail } : null,
      metadata: e.metadataJson ? JSON.parse(e.metadataJson) : null,
    }));

    return Response.json({ feed, count: feed.length, offset });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
