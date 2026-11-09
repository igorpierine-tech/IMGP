import { eq, and } from "drizzle-orm";
import { webhooks, webhookDeliveries } from "../../db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

export type WebhookEvent = {
  event: string;
  payload: Record<string, unknown>;
};

async function signPayload(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function dispatchWebhooks(
  db: DrizzleD1Database<typeof schema>,
  eventData: WebhookEvent,
) {
  const activeHooks = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.active, true));

  const matching = activeHooks.filter((wh) => {
    const events: string[] = JSON.parse(wh.eventsJson);
    return events.length === 0 || events.includes(eventData.event) || events.includes("*");
  });

  const results = await Promise.allSettled(
    matching.map(async (wh) => {
      const payloadStr = JSON.stringify({
        event: eventData.event,
        timestamp: new Date().toISOString(),
        data: eventData.payload,
      });

      const signature = await signPayload(wh.secret, payloadStr);
      const start = Date.now();
      let responseStatus = 0;
      let responseBody = "";
      let success = false;

      try {
        const resp = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": `sha256=${signature}`,
            "X-Webhook-Event": eventData.event,
          },
          body: payloadStr,
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = resp.status;
        responseBody = (await resp.text()).slice(0, 2000);
        success = resp.ok;
      } catch (err) {
        responseBody = err instanceof Error ? err.message : "Unknown error";
      }

      const durationMs = Date.now() - start;

      await db.insert(webhookDeliveries).values({
        webhookId: wh.id,
        event: eventData.event,
        payloadJson: payloadStr,
        responseStatus: responseStatus || null,
        responseBody: responseBody || null,
        durationMs,
        success,
      });

      if (success) {
        await db.update(webhooks).set({
          lastTriggeredAt: new Date(),
          failureCount: 0,
          updatedAt: new Date(),
        }).where(eq(webhooks.id, wh.id));
      } else {
        await db.update(webhooks).set({
          failureCount: wh.failureCount + 1,
          active: wh.failureCount + 1 >= 10 ? false : wh.active,
          updatedAt: new Date(),
        }).where(eq(webhooks.id, wh.id));
      }
    }),
  );

  return { dispatched: matching.length, results };
}
