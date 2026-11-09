import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { getDashboardKpis } from "@/lib/server/dashboard";
import { HttpError } from "@/lib/server/errors";
import { errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "dashboard:read", [
      "project_coordinator", "it_director", "project_analyst", "keyuser", "requester", "area_manager", "viewer",
    ]);
    const kpis = await getDashboardKpis(ctx);
    return Response.json({ dashboard: kpis });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error) },
      { status: error instanceof HttpError ? error.status : 500 },
    );
  }
}
