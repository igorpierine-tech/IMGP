import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projectPhases, projects, sprints } from "@/db/schema";
import { HttpError, requireApiUser, requireRole } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { writeAudit } from "@/lib/server/audit";

const editors = ["project_coordinator", "it_director", "project_analyst"] as const;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiUser();
    requireRole(actor, editors);
    const body = await request.json() as Record<string, unknown>;
    const values = await validatedValues(body);
    const [created] = await getDb().insert(sprints).values(values).returning();
    await writeAudit({ actor, action: "sprint.created", entityType: "sprint", entityId: created.id, requestId: request.headers.get("cf-ray"), after: created });
    return Response.json({ sprint: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiUser();
    requireRole(actor, editors);
    const body = await request.json() as Record<string, unknown>;
    const id = positiveInteger(body.id);
    if (!id) throw new HttpError(400, "Sprint não informada.");
    const [before] = await getDb().select().from(sprints).where(eq(sprints.id, id)).limit(1);
    if (!before) throw new HttpError(404, "Sprint não encontrada.");
    const values = await validatedValues(body, before.projectId);
    const [updated] = await getDb().update(sprints).set({ ...values, updatedAt: new Date() }).where(eq(sprints.id, id)).returning();
    await writeAudit({ actor, action: "sprint.updated", entityType: "sprint", entityId: id, requestId: request.headers.get("cf-ray"), before, after: updated });
    return Response.json({ sprint: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

async function validatedValues(body: Record<string, unknown>, fallbackProjectId?: number) {
  const projectId = positiveInteger(body.projectId) || fallbackProjectId;
  const phaseId = positiveInteger(body.phaseId);
  const name = clean(body.name, 180);
  if (!projectId || !phaseId || !name) throw new HttpError(400, "Projeto, fase e nome da sprint são obrigatórios.");
  const [project] = await getDb().select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const [phase] = await getDb().select().from(projectPhases).where(eq(projectPhases.id, phaseId)).limit(1);
  const expectedRef = project?.source === "glpi" ? `glpi:${project.externalId}` : `platform:${projectId}`;
  if (!project) throw new HttpError(404, "Projeto não encontrado.");
  if (!phase || phase.projectRef !== expectedRef) throw new HttpError(400, "A fase selecionada não pertence ao projeto.");
  return {
    projectId, phaseId, name,
    objective: clean(body.objective, 1000) || null,
    status: clean(body.status, 50) || "Planejada",
    startDate: clean(body.startDate, 10) || null,
    endDate: clean(body.endDate, 10) || null,
  };
}

function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function positiveInteger(value: unknown) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
function assertSameOrigin(request: Request) { const origin = request.headers.get("origin"); if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Origem da requisição não autorizada."); }
