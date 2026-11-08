import { count, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, projectItems, projects, timeEntries, users } from "@/db/schema";
import { HttpError, requireApiUser } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";

export async function GET() {
  try {
    const user = await requireApiUser();
    const db = getDb();
    const [projectCount, itemCount, timeCount, userCount, events] = await Promise.all([
      db.select({ value: count() }).from(projects),
      db.select({ value: count() }).from(projectItems),
      db.select({ value: count() }).from(timeEntries),
      db.select({ value: count() }).from(users),
      db.select().from(auditEvents).orderBy(desc(auditEvents.occurredAt)).limit(12),
    ]);
    return Response.json({
      user,
      database: {
        provider: "Cloudflare D1",
        projects: projectCount[0].value,
        items: itemCount[0].value,
        timeEntries: timeCount[0].value,
        users: userCount[0].value,
      },
      security: { authenticated: true, authorization: "RBAC", auditEnabled: true },
      audit: events,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
