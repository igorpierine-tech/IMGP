import { eq, and, sql } from "drizzle-orm";
import { taskDependencies, projectItems } from "@/db/schema";
import { getApiContext, checkPermissionOrRole, type ApiContext } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const projectId = Number(url.searchParams.get("projectId"));
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new HttpError(400, "projectId é obrigatório.");
    }

    const deps = await ctx.db
      .select({
        id: taskDependencies.id,
        predecessorId: taskDependencies.predecessorId,
        successorId: taskDependencies.successorId,
        type: taskDependencies.type,
        lagDays: taskDependencies.lagDays,
        predecessorName: sql<string>`pred.name`,
        successorName: sql<string>`succ.name`,
      })
      .from(taskDependencies)
      .innerJoin(
        sql`project_items AS pred`,
        sql`pred.id = ${taskDependencies.predecessorId}`,
      )
      .innerJoin(
        sql`project_items AS succ`,
        sql`succ.id = ${taskDependencies.successorId}`,
      )
      .where(sql`pred.project_id = ${projectId}`);

    return Response.json({ dependencies: deps });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director", "project_analyst"]);
    const body = await request.json() as Record<string, unknown>;

    const predecessorId = Number(body.predecessorId);
    const successorId = Number(body.successorId);
    const type = typeof body.type === "string" ? body.type : "finish_to_start";
    const lagDays = typeof body.lagDays === "number" ? body.lagDays : 0;

    if (!Number.isInteger(predecessorId) || predecessorId <= 0) throw new HttpError(400, "predecessorId é obrigatório.");
    if (!Number.isInteger(successorId) || successorId <= 0) throw new HttpError(400, "successorId é obrigatório.");
    if (predecessorId === successorId) throw new HttpError(400, "Uma tarefa não pode depender de si mesma.");

    const [pred] = await ctx.db.select({ id: projectItems.id, projectId: projectItems.projectId }).from(projectItems).where(eq(projectItems.id, predecessorId)).limit(1);
    const [succ] = await ctx.db.select({ id: projectItems.id, projectId: projectItems.projectId }).from(projectItems).where(eq(projectItems.id, successorId)).limit(1);
    if (!pred || !succ) throw new HttpError(404, "Tarefa não encontrada.");
    if (pred.projectId !== succ.projectId) throw new HttpError(400, "As tarefas devem pertencer ao mesmo projeto.");

    if (await detectCycle(ctx.db, predecessorId, successorId)) {
      throw new HttpError(400, "Dependência circular detectada.");
    }

    const [created] = await ctx.db.insert(taskDependencies).values({
      predecessorId,
      successorId,
      type,
      lagDays,
    }).returning();

    return Response.json({ dependency: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director", "project_analyst"]);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID é obrigatório.");

    await ctx.db.delete(taskDependencies).where(eq(taskDependencies.id, id));
    return Response.json({ message: "Dependência removida." });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

async function detectCycle(
  db: ApiContext["db"],
  predecessorId: number,
  successorId: number,
): Promise<boolean> {
  const visited = new Set<number>();
  const queue = [predecessorId];

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (current === successorId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const preds = await db
      .select({ predecessorId: taskDependencies.predecessorId })
      .from(taskDependencies)
      .where(eq(taskDependencies.successorId, current));

    for (const p of preds) {
      queue.push(p.predecessorId);
    }
  }

  return false;
}
