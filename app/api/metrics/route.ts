import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { getVelocityMetrics, getDemandSlaMetrics, getTeamProductivity, getBurndownData } from "@/lib/server/metrics";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "dashboard:read", [
      "project_coordinator", "it_director", "project_analyst",
    ]);

    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "all";
    const projectId = Number(url.searchParams.get("projectId")) || undefined;
    const sprintId = Number(url.searchParams.get("sprintId")) || undefined;
    const days = Math.min(Number(url.searchParams.get("days")) || 30, 90);

    const result: Record<string, unknown> = {};

    if (type === "all" || type === "velocity") {
      result.velocity = await getVelocityMetrics(ctx, projectId);
    }
    if (type === "all" || type === "sla") {
      result.sla = await getDemandSlaMetrics(ctx);
    }
    if (type === "all" || type === "productivity") {
      result.productivity = await getTeamProductivity(ctx, days);
    }
    if (type === "burndown" && sprintId) {
      result.burndown = await getBurndownData(ctx, sprintId);
    }

    return Response.json({ metrics: result });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
