import { eq, desc } from "drizzle-orm";
import { automationRules } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

const VALID_TRIGGERS = [
  "task.status_changed", "task.assigned", "demand.stage_changed",
  "demand.approved", "project.created", "project.completed", "comment.created",
];
const VALID_ACTIONS = ["notify", "email", "set_field", "create_task"];

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:read", ["project_coordinator", "it_director"]);

    const rules = await ctx.db.select().from(automationRules).orderBy(desc(automationRules.updatedAt));
    return Response.json({
      rules: rules.map(r => ({
        ...r,
        triggerConditionsJson: r.triggerConditionsJson ? JSON.parse(r.triggerConditionsJson) : null,
        actionConfigJson: JSON.parse(r.actionConfigJson),
      })),
      validTriggers: VALID_TRIGGERS,
      validActions: VALID_ACTIONS,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const triggerEvent = String(body.triggerEvent ?? "");
    const actionType = String(body.actionType ?? "");
    const actionConfig = body.actionConfig as Record<string, unknown> | undefined;
    const triggerConditions = body.triggerConditions as Record<string, unknown> | undefined;

    if (!name) throw new HttpError(400, "Nome é obrigatório.");
    if (!VALID_TRIGGERS.includes(triggerEvent)) throw new HttpError(400, `Trigger inválido. Use: ${VALID_TRIGGERS.join(", ")}`);
    if (!VALID_ACTIONS.includes(actionType)) throw new HttpError(400, `Ação inválida. Use: ${VALID_ACTIONS.join(", ")}`);
    if (!actionConfig) throw new HttpError(400, "actionConfig é obrigatório.");

    const [rule] = await ctx.db.insert(automationRules).values({
      name,
      description: typeof body.description === "string" ? body.description.trim() : null,
      triggerEvent,
      triggerConditionsJson: triggerConditions ? JSON.stringify(triggerConditions) : null,
      actionType,
      actionConfigJson: JSON.stringify(actionConfig),
      createdBy: ctx.user.id,
    }).returning();

    await writeAudit({ actor: ctx.user, action: "automation.created", entityType: "automation", entityId: rule.id, requestId: request.headers.get("cf-ray"), after: rule });
    return Response.json({ rule }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID inválido.");

    const [existing] = await ctx.db.select().from(automationRules).where(eq(automationRules.id, id)).limit(1);
    if (!existing) throw new HttpError(404, "Regra não encontrada.");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.active === "boolean") updates.active = body.active;
    if (body.actionConfig) updates.actionConfigJson = JSON.stringify(body.actionConfig);
    if (body.triggerConditions !== undefined) updates.triggerConditionsJson = body.triggerConditions ? JSON.stringify(body.triggerConditions) : null;

    const [updated] = await ctx.db.update(automationRules).set(updates).where(eq(automationRules.id, id)).returning();
    await writeAudit({ actor: ctx.user, action: "automation.updated", entityType: "automation", entityId: id, requestId: request.headers.get("cf-ray"), before: existing, after: updated });
    return Response.json({ rule: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:delete", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID inválido.");

    await ctx.db.delete(automationRules).where(eq(automationRules.id, id));
    await writeAudit({ actor: ctx.user, action: "automation.deleted", entityType: "automation", entityId: id, requestId: request.headers.get("cf-ray") });
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
