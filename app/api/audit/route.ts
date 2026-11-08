import { desc } from "drizzle-orm";
import { auditEvents } from "@/db/schema";
import { HttpError } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "audit:read", ["project_coordinator", "it_director"]);
    const events = await ctx.db.select().from(auditEvents).orderBy(desc(auditEvents.occurredAt)).limit(250);
    return Response.json({ events });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
