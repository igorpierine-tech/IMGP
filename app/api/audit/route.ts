import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";
import { HttpError, requireApiUser, requireRole } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";

export async function GET() {
  try {
    const user = await requireApiUser();
    requireRole(user, ["project_coordinator", "it_director"]);
    const events = await getDb().select().from(auditEvents).orderBy(desc(auditEvents.occurredAt)).limit(250);
    return Response.json({ events });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
