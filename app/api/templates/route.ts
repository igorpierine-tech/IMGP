import { eq, desc } from "drizzle-orm";
import { projectTemplates, templateItems } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { createProjectFromTemplate } from "@/lib/server/project-templates";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const templateId = Number(url.searchParams.get("id"));

    if (templateId) {
      const [template] = await ctx.db.select().from(projectTemplates).where(eq(projectTemplates.id, templateId)).limit(1);
      if (!template) throw new HttpError(404, "Template não encontrado.");
      const items = await ctx.db.select().from(templateItems).where(eq(templateItems.templateId, templateId)).orderBy(templateItems.sequence);
      return Response.json({ template: { ...template, phasesJson: template.phasesJson ? JSON.parse(template.phasesJson) : null }, items });
    }

    const all = await ctx.db.select().from(projectTemplates).where(eq(projectTemplates.active, true)).orderBy(projectTemplates.name);
    return Response.json({ templates: all.map(t => ({ ...t, phasesJson: t.phasesJson ? JSON.parse(t.phasesJson) : null })) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "create");

    if (action === "instantiate") {
      const templateId = Number(body.templateId);
      const projectName = String(body.projectName ?? "").trim();
      const startDate = String(body.startDate ?? "").trim();
      if (!templateId) throw new HttpError(400, "templateId é obrigatório.");
      if (!projectName) throw new HttpError(400, "projectName é obrigatório.");
      if (!startDate) throw new HttpError(400, "startDate é obrigatório.");

      const project = await createProjectFromTemplate(ctx, templateId, projectName, startDate);
      await writeAudit({ actor: ctx.user, action: "project.created_from_template", entityType: "project", entityId: project.id, requestId: request.headers.get("cf-ray"), after: project, metadata: { templateId } });
      return Response.json({ project }, { status: 201 });
    }

    const name = String(body.name ?? "").trim();
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const projectTypeId = Number(body.projectTypeId) || null;
    const phases = Array.isArray(body.phases) ? body.phases : null;
    const items = Array.isArray(body.items) ? body.items : [];

    if (!name) throw new HttpError(400, "Nome do template é obrigatório.");

    const [template] = await ctx.db.insert(projectTemplates).values({
      name,
      description,
      projectTypeId,
      phasesJson: phases ? JSON.stringify(phases) : null,
      createdBy: ctx.user.id,
    }).returning();

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as Record<string, unknown>;
      await ctx.db.insert(templateItems).values({
        templateId: template.id,
        kind: String(item.kind ?? "task"),
        name: String(item.name ?? `Item ${i + 1}`),
        description: typeof item.description === "string" ? item.description : null,
        relativeStartDays: Number(item.relativeStartDays) || 0,
        durationDays: Number(item.durationDays) || 1,
        assignedRole: typeof item.assignedRole === "string" ? item.assignedRole : null,
        parentRef: typeof item.parentRef === "string" ? item.parentRef : null,
        itemRef: typeof item.itemRef === "string" ? item.itemRef : null,
        predecessorRefsJson: Array.isArray(item.predecessorRefs) ? JSON.stringify(item.predecessorRefs) : null,
        sequence: i,
      });
    }

    await writeAudit({ actor: ctx.user, action: "template.created", entityType: "template", entityId: template.id, requestId: request.headers.get("cf-ray"), after: template });
    return Response.json({ template }, { status: 201 });
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
    const before = await ctx.db.select().from(projectTemplates).where(eq(projectTemplates.id, id)).limit(1);
    if (!before[0]) throw new HttpError(404, "Template não encontrado.");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) throw new HttpError(400, "Nome é obrigatório.");
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const [updated] = await ctx.db.update(projectTemplates).set({ name, description, updatedAt: new Date() }).where(eq(projectTemplates.id, id)).returning();
    await writeAudit({ actor: ctx.user, action: "template.updated", entityType: "template", entityId: id, requestId: request.headers.get("cf-ray"), before: before[0], after: updated });
    return Response.json({ template: updated });
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

    await ctx.db.update(projectTemplates).set({ active: false, updatedAt: new Date() }).where(eq(projectTemplates.id, id));
    await writeAudit({ actor: ctx.user, action: "template.deactivated", entityType: "template", entityId: id, requestId: request.headers.get("cf-ray") });
    return Response.json({ deactivated: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
