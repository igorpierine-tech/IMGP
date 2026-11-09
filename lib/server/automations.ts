import { eq, and } from "drizzle-orm";
import { automationRules } from "../../db/schema";
import { createNotification } from "./notify";
import { sendNotificationEmail } from "./email";
import type { ApiContext } from "./api-context";

type TriggerEvent =
  | "task.status_changed"
  | "task.assigned"
  | "demand.stage_changed"
  | "demand.approved"
  | "project.created"
  | "project.completed"
  | "comment.created";

type ActionType = "notify" | "email" | "set_field" | "create_task";

type AutomationContext = {
  event: TriggerEvent;
  entityType: string;
  entityId: number;
  data: Record<string, unknown>;
  apiCtx: ApiContext;
};

function matchesConditions(conditions: Record<string, unknown> | null, data: Record<string, unknown>): boolean {
  if (!conditions) return true;
  for (const [key, expected] of Object.entries(conditions)) {
    if (data[key] !== expected) return false;
  }
  return true;
}

export async function executeAutomations(autoCtx: AutomationContext): Promise<number> {
  const { event, apiCtx, data, entityType, entityId } = autoCtx;

  const rules = await apiCtx.db
    .select()
    .from(automationRules)
    .where(and(eq(automationRules.triggerEvent, event), eq(automationRules.active, true)));

  let executed = 0;

  for (const rule of rules) {
    const conditions = rule.triggerConditionsJson ? JSON.parse(rule.triggerConditionsJson) : null;
    if (!matchesConditions(conditions, data)) continue;

    const config = JSON.parse(rule.actionConfigJson);
    const actionType = rule.actionType as ActionType;

    try {
      switch (actionType) {
        case "notify": {
          const userIds = Array.isArray(config.userIds) ? config.userIds : [];
          const title = String(config.title ?? rule.name);
          const body = String(config.body ?? `Evento: ${event}`);
          for (const userId of userIds) {
            await createNotification(apiCtx.db, { userId, type: event, title, body, entityType, entityId: String(entityId) });
          }
          break;
        }
        case "email": {
          const to = String(config.to ?? "");
          const title = String(config.title ?? rule.name);
          const body = String(config.body ?? `Evento: ${event}`);
          if (to) await sendNotificationEmail(to, title, body);
          break;
        }
        case "set_field":
        case "create_task":
          break;
      }

      await apiCtx.db
        .update(automationRules)
        .set({
          executionCount: rule.executionCount + 1,
          lastExecutedAt: new Date(),
        })
        .where(eq(automationRules.id, rule.id));

      executed++;
    } catch (err) {
      console.error(`[automation] Falha na regra ${rule.id}:`, err);
    }
  }

  return executed;
}
