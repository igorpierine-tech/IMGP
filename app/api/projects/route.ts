import { desc, eq } from "drizzle-orm";
import { projects, projectTypes } from "@/db/schema";
import { writeAudit } from "@/lib/server/audit";
import { HttpError } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const rows = await ctx.db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(500);
    return Response.json({ projects: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", ["project_coordinator", "it_director", "project_analyst"]);
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const projectTypeId = Number(body.projectTypeId);
    const projectPrioritized = body.projectPrioritized === true;
    const prioritizationDate = typeof body.prioritizationDate === "string" ? body.prioritizationDate.trim() : "";
    const approvingDirector = typeof body.approvingDirector === "string" ? body.approvingDirector.trim() : "";
    if (!name) throw new HttpError(400, "O nome do projeto é obrigatório.");
    if (!Number.isInteger(projectTypeId) || projectTypeId <= 0) throw new HttpError(400, "Selecione o tipo do projeto.");
    const [projectType] = await ctx.db.select({ id: projectTypes.id, active: projectTypes.active }).from(projectTypes).where(eq(projectTypes.id, projectTypeId)).limit(1);
    if (!projectType?.active) throw new HttpError(400, "O tipo de projeto selecionado não está disponível.");
    if (projectPrioritized && (!prioritizationDate || !approvingDirector)) {
      throw new HttpError(400, "Informe a data da priorização e o diretor que aprovou o projeto.");
    }
    const [created] = await ctx.db.insert(projects).values({
      name,
      projectTypeId,
      code: typeof body.code === "string" ? body.code.trim() : null,
      area: typeof body.area === "string" ? body.area.trim() : null,
      managerName: typeof body.managerName === "string" ? body.managerName.trim() : null,
      status: typeof body.status === "string" ? body.status : "planning",
      plannedStart: typeof body.plannedStart === "string" ? body.plannedStart : null,
      plannedEnd: typeof body.plannedEnd === "string" ? body.plannedEnd : null,
      plannedHours: typeof body.plannedHours === "number" ? body.plannedHours : 0,
      plannedCost: typeof body.plannedCost === "number" ? body.plannedCost : 0,
      projectPrioritized,
      prioritizationDate: projectPrioritized ? prioritizationDate : null,
      approvingDirector: projectPrioritized ? approvingDirector : null,
    }).returning();
    await writeAudit({ actor: ctx.user, action: "project.created", entityType: "project", entityId: created.id, requestId: request.headers.get("cf-ray"), after: created });
    return Response.json({ project: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director", "project_analyst"]);
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id), projectTypeId = Number(body.projectTypeId);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Projeto inválido.");
    if (!Number.isInteger(projectTypeId) || projectTypeId <= 0) throw new HttpError(400, "Selecione o tipo do projeto.");
    const [projectType] = await ctx.db.select({ id: projectTypes.id, active: projectTypes.active }).from(projectTypes).where(eq(projectTypes.id, projectTypeId)).limit(1);
    if (!projectType?.active) throw new HttpError(400, "O tipo de projeto selecionado não está disponível.");
    const [before] = await ctx.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!before) throw new HttpError(404, "Projeto não encontrado.");
    const validStatuses = ["planning", "active", "on_hold", "completed", "cancelled"];
    const newStatus = typeof body.status === "string" && validStatuses.includes(body.status) ? body.status : before.status;
    const [updated] = await ctx.db.update(projects).set({ projectTypeId, status: newStatus, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    await writeAudit({ actor: ctx.user, action: "project.type_updated", entityType: "project", entityId: id, requestId: request.headers.get("cf-ray"), before, after: updated });
    return Response.json({ project: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
