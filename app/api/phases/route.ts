import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projectPhases } from "@/db/schema";
import { HttpError, requireApiUser, requireRole } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { writeAudit } from "@/lib/server/audit";

const editors = ["project_coordinator", "it_director", "project_analyst"] as const;

export async function GET(request: Request) {
  try {
    await requireApiUser();
    const projectRef = new URL(request.url).searchParams.get("projectRef");
    const query = getDb().select().from(projectPhases);
    const rows = projectRef
      ? await query.where(eq(projectPhases.projectRef, projectRef)).orderBy(asc(projectPhases.sequence), asc(projectPhases.name))
      : await query.orderBy(asc(projectPhases.projectRef), asc(projectPhases.sequence), asc(projectPhases.name));
    return Response.json({ phases: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiUser();
    requireRole(actor, editors);
    const body = await request.json() as Record<string, unknown>;
    const projectRef = clean(body.projectRef, 100);
    const projectName = clean(body.projectName, 250);
    const name = clean(body.name, 120);
    const description = clean(body.description, 500);
    const sequence = Number.isInteger(body.sequence) ? Number(body.sequence) : 0;
    if (!projectRef || !projectName || !name) throw new HttpError(400, "Projeto e nome da fase são obrigatórios.");
    const duplicate = await getDb().select({ id: projectPhases.id }).from(projectPhases).where(and(eq(projectPhases.projectRef, projectRef), eq(projectPhases.name, name))).limit(1);
    if (duplicate.length) throw new HttpError(409, "Esta fase já está cadastrada no projeto.");
    const [created] = await getDb().insert(projectPhases).values({ projectRef, projectName, name, description: description || null, sequence, createdBy: actor.id }).returning();
    await writeAudit({ actor, action: "phase.created", entityType: "project_phase", entityId: created.id, requestId: request.headers.get("cf-ray"), after: created });
    return Response.json({ phase: created }, { status: 201 });
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
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Fase não informada.");
    const update: Partial<typeof projectPhases.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.name === "string" && clean(body.name, 120)) update.name = clean(body.name, 120);
    if (typeof body.description === "string") update.description = clean(body.description, 500) || null;
    if (Number.isInteger(body.sequence)) update.sequence = Number(body.sequence);
    if (typeof body.active === "boolean") update.active = body.active;
    const [updated] = await getDb().update(projectPhases).set(update).where(eq(projectPhases.id, id)).returning();
    if (!updated) throw new HttpError(404, "Fase não encontrada.");
    await writeAudit({ actor, action: "phase.updated", entityType: "project_phase", entityId: id, requestId: request.headers.get("cf-ray"), after: updated });
    return Response.json({ phase: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function assertSameOrigin(request: Request) { const origin = request.headers.get("origin"); if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Origem da requisição não autorizada."); }
