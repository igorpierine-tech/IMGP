import { notifications } from "../../db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

export type NotifyParams = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
};

export async function createNotification(
  db: DrizzleD1Database<typeof schema>,
  params: NotifyParams,
) {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
    })
    .returning();
  return row;
}

export async function createNotifications(
  db: DrizzleD1Database<typeof schema>,
  batch: NotifyParams[],
) {
  if (batch.length === 0) return;
  await db.insert(notifications).values(
    batch.map((p) => ({
      userId: p.userId,
      type: p.type,
      title: p.title,
      body: p.body ?? null,
      entityType: p.entityType ?? null,
      entityId: p.entityId ?? null,
    })),
  );
}
