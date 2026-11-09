import { desc, eq } from "drizzle-orm";
import { demands, projectTypes } from "@/db/schema";
import { writeAudit } from "@/lib/server/audit";
import { HttpError } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";

const demandRoles = ["project_coordinator", "it_director", "project_analyst", "keyuser", "requester", "area_manager"] as const;
const demandManagers = ["project_coordinator", "it_director", "project_analyst"] as const;
const impacts = ["Baixo", "Médio", "Alto"];
const requirementFields = [
  "company", "directorate", "processOwner", "demandType", "currentProcess", "scope",
  "expectedProcess", "businessRules", "acceptanceCriteria", "automationDetails", "reportDetails",
  "integrationDetails", "systemChangeDetails", "newSolutionDetails", "otherDemandDetails",
  "benefitType", "dataAvailability", "monthlyExecutions", "minutesPerExecution", "volumeSource",
  "missingData", "volumeNotApplicableReason", "reworkStatus", "reworkDetails", "reworkContact",
  "hasRequiredDate", "requiredDate", "requiredDateReason", "evidenceAvailability", "evidenceExplanation",
] as const;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function requirementData(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result: Record<string, string> = {};
  for (const field of requirementFields) {
    const entry = source[field];
    if (typeof entry === "string") result[field] = entry.trim().slice(0, 5000);
    else if (typeof entry === "number" && Number.isFinite(entry)) result[field] = String(entry);
  }
  const serialized = JSON.stringify(result);
  if (serialized.length > 50000) throw new HttpError(400, "O levantamento de requisitos ultrapassou o limite permitido.");
  return serialized;
}

function prioritization(body: Record<string, unknown>) {
  const projectPrioritized = body.projectPrioritized === true || body.projectPrioritized === "true";
  const prioritizationDate = projectPrioritized ? text(body.prioritizationDate) : "";
  const approvingDirector = projectPrioritized ? text(body.approvingDirector) : "";
  if (projectPrioritized && (!prioritizationDate || !approvingDirector)) {
    throw new HttpError(400, "Informe a data da priorização e o diretor que aprovou.");
  }
  return { projectPrioritized, prioritizationDate: prioritizationDate || null, approvingDirector: approvingDirector || null };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validProjectType(value: unknown, db: any) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Selecione o tipo do projeto.");
  const [row] = await db.select({ id: projectTypes.id, active: projectTypes.active }).from(projectTypes).where(eq(projectTypes.id, id)).limit(1);
  if (!row?.active) throw new HttpError(400, "O tipo de projeto selecionado não está disponível.");
  return id;
}

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const rows = await ctx.db.select().from(demands).orderBy(desc(demands.updatedAt)).limit(500);
    return Response.json({ demands: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "demands:create", demandRoles);
    const body = await request.json() as Record<string, unknown>;
    const name = text(body.name), area = text(body.area), objective = text(body.objective);
    if (!name || !area || !objective) throw new HttpError(400, "Informe o título, a área solicitante e o problema ou necessidade.");
    const impact = text(body.impact);
    const projectTypeId = await validProjectType(body.projectTypeId, ctx.db);
    const priority = prioritization(body);
    const [created] = await ctx.db.insert(demands).values({
      name,
      projectTypeId,
      area,
      requesterUserId: ctx.user.id,
      requesterName: ctx.user.displayName,
      requesterEmail: ctx.user.email,
      objective,
      solution: text(body.solution),
      benefit: text(body.benefit),
      risk: text(body.risk),
      estimatedCost: number(body.cost),
      estimatedHours: number(body.hours),
      impact: impacts.includes(impact) ? impact : "Médio",
      requirementsJson: requirementData(body.requirements),
      ...priority,
    }).returning();
    await writeAudit({ actor: ctx.user, action: "demand.created", entityType: "demand", entityId: created.id, requestId: request.headers.get("cf-ray"), after: created, db: ctx.db });
    return Response.json({ demand: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "demands:update", demandRoles);
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Demanda inválida.");
    const before = await ctx.db.select().from(demands).where(eq(demands.id, id)).limit(1);
    if (!before[0]) throw new HttpError(404, "Demanda não encontrada.");
    if (!(demandManagers as readonly string[]).includes(ctx.user.role) && before[0].requesterUserId !== ctx.user.id) {
      throw new HttpError(403, "Você só pode alterar as demandas que cadastrou.");
    }
    const impact = text(body.impact);
    const projectTypeId = await validProjectType(body.projectTypeId ?? before[0].projectTypeId, ctx.db);
    const priority = prioritization(body);
    const [updated] = await ctx.db.update(demands).set({
      objective: text(body.objective) || before[0].objective,
      projectTypeId,
      solution: text(body.solution),
      benefit: text(body.benefit),
      risk: text(body.risk),
      estimatedCost: number(body.cost),
      estimatedHours: number(body.hours),
      impact: impacts.includes(impact) ? impact : before[0].impact,
      requirementsJson: requirementData(body.requirements),
      ...priority,
      stage: text(body.stage) || before[0].stage,
      updatedAt: new Date(),
    }).where(eq(demands.id, id)).returning();
    await writeAudit({ actor: ctx.user, action: "demand.updated", entityType: "demand", entityId: id, requestId: request.headers.get("cf-ray"), before: before[0], after: updated, db: ctx.db });
    return Response.json({ demand: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "demands:delete", demandManagers);
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Demanda inválida.");
    const before = await ctx.db.select().from(demands).where(eq(demands.id, id)).limit(1);
    if (!before[0]) throw new HttpError(404, "Demanda não encontrada.");
    await ctx.db.delete(demands).where(eq(demands.id, id));
    await writeAudit({ actor: ctx.user, action: "demand.deleted", entityType: "demand", entityId: id, requestId: request.headers.get("cf-ray"), before: before[0], db: ctx.db });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
