import { eq, and, desc } from "drizzle-orm";
import { customFieldDefinitions, customFieldValues } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType");
    const entityId = Number(url.searchParams.get("entityId"));

    if (entityType && entityId) {
      const defs = await ctx.db
        .select()
        .from(customFieldDefinitions)
        .where(and(eq(customFieldDefinitions.entityType, entityType), eq(customFieldDefinitions.active, true)))
        .orderBy(customFieldDefinitions.sequence);

      const vals = await ctx.db
        .select()
        .from(customFieldValues)
        .where(eq(customFieldValues.entityId, entityId));

      const valMap = new Map(vals.map(v => [v.fieldId, v]));
      const fields = defs.map(d => ({
        ...d,
        optionsJson: d.optionsJson ? JSON.parse(d.optionsJson) : null,
        value: valMap.get(d.id) ?? null,
      }));

      return Response.json({ fields });
    }

    if (entityType) {
      const defs = await ctx.db
        .select()
        .from(customFieldDefinitions)
        .where(eq(customFieldDefinitions.entityType, entityType))
        .orderBy(customFieldDefinitions.sequence);
      return Response.json({ definitions: defs.map(d => ({ ...d, optionsJson: d.optionsJson ? JSON.parse(d.optionsJson) : null })) });
    }

    const all = await ctx.db.select().from(customFieldDefinitions).orderBy(customFieldDefinitions.entityType, customFieldDefinitions.sequence);
    return Response.json({ definitions: all.map(d => ({ ...d, optionsJson: d.optionsJson ? JSON.parse(d.optionsJson) : null })) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "create_definition";

    if (action === "create_definition") {
      const entityType = String(body.entityType ?? "").trim();
      const fieldKey = String(body.fieldKey ?? "").trim().replace(/[^a-z0-9_]/gi, "_").toLowerCase();
      const label = String(body.label ?? "").trim();
      const fieldType = String(body.fieldType ?? "text").trim();
      const options = Array.isArray(body.options) ? body.options : null;
      const required = body.required === true;
      const sequence = typeof body.sequence === "number" ? body.sequence : 0;

      if (!entityType) throw new HttpError(400, "entityType é obrigatório.");
      if (!fieldKey) throw new HttpError(400, "fieldKey é obrigatório.");
      if (!label) throw new HttpError(400, "label é obrigatório.");
      if (!["text", "number", "date", "select", "multiselect", "boolean", "url"].includes(fieldType)) {
        throw new HttpError(400, "fieldType inválido.");
      }

      const [created] = await ctx.db.insert(customFieldDefinitions).values({
        entityType,
        fieldKey,
        label,
        fieldType,
        optionsJson: options ? JSON.stringify(options) : null,
        required,
        sequence,
        createdBy: ctx.user.id,
      }).returning();

      await writeAudit({ actor: ctx.user, action: "custom_field.created", entityType: "custom_field", entityId: created.id, requestId: request.headers.get("cf-ray"), after: created });
      return Response.json({ definition: { ...created, optionsJson: options } }, { status: 201 });
    }

    if (action === "set_value") {
      const fieldId = Number(body.fieldId);
      const entityId = Number(body.entityId);
      if (!Number.isInteger(fieldId) || fieldId <= 0) throw new HttpError(400, "fieldId inválido.");
      if (!Number.isInteger(entityId) || entityId <= 0) throw new HttpError(400, "entityId inválido.");

      const [def] = await ctx.db.select().from(customFieldDefinitions).where(eq(customFieldDefinitions.id, fieldId)).limit(1);
      if (!def) throw new HttpError(404, "Campo não encontrado.");

      const valueText = typeof body.valueText === "string" ? body.valueText : null;
      const valueNumber = typeof body.valueNumber === "number" ? body.valueNumber : null;
      const valueDate = typeof body.valueDate === "string" ? body.valueDate : null;
      const valueJson = body.valueJson !== undefined ? JSON.stringify(body.valueJson) : null;

      const [existing] = await ctx.db
        .select()
        .from(customFieldValues)
        .where(and(eq(customFieldValues.fieldId, fieldId), eq(customFieldValues.entityId, entityId)))
        .limit(1);

      if (existing) {
        const [updated] = await ctx.db
          .update(customFieldValues)
          .set({ valueText, valueNumber, valueDate, valueJson, updatedAt: new Date() })
          .where(eq(customFieldValues.id, existing.id))
          .returning();
        return Response.json({ value: updated });
      }

      const [created] = await ctx.db.insert(customFieldValues).values({
        fieldId, entityId, valueText, valueNumber, valueDate, valueJson,
      }).returning();
      return Response.json({ value: created }, { status: 201 });
    }

    throw new HttpError(400, "Ação inválida. Use 'create_definition' ou 'set_value'.");
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

    const [def] = await ctx.db.select().from(customFieldDefinitions).where(eq(customFieldDefinitions.id, id)).limit(1);
    if (!def) throw new HttpError(404, "Campo não encontrado.");

    await ctx.db.update(customFieldDefinitions).set({ active: false, updatedAt: new Date() }).where(eq(customFieldDefinitions.id, id));

    await writeAudit({ actor: ctx.user, action: "custom_field.deactivated", entityType: "custom_field", entityId: id, requestId: request.headers.get("cf-ray"), before: def });
    return Response.json({ deactivated: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
