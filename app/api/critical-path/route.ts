import { getApiContext } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { computeCriticalPath } from "@/lib/server/critical-path";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const projectId = Number(url.searchParams.get("projectId"));
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new HttpError(400, "projectId é obrigatório.");
    }

    const tasks = await computeCriticalPath(ctx.db, projectId);
    const critical = tasks.filter((t) => t.critical);

    return Response.json({
      tasks,
      criticalPath: critical.map((t) => ({ id: t.id, name: t.name })),
      projectDuration: tasks.length > 0
        ? Math.max(...tasks.map((t) => t.earlyFinish)) - Math.min(...tasks.filter((t) => t.earlyStart > 0).map((t) => t.earlyStart))
        : 0,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
