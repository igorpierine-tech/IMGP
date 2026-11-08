import { count, desc } from "drizzle-orm";
import { auditEvents, projectItems, projects, timeEntries, users } from "@/db/schema";
import { HttpError } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { getApiContext } from "@/lib/server/api-context";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const [projectCount, itemCount, timeCount, userCount, events] = await Promise.all([
      ctx.db.select({ value: count() }).from(projects),
      ctx.db.select({ value: count() }).from(projectItems),
      ctx.db.select({ value: count() }).from(timeEntries),
      ctx.db.select({ value: count() }).from(users),
      ctx.db.select().from(auditEvents).orderBy(desc(auditEvents.occurredAt)).limit(12),
    ]);
    return Response.json({
      user: ctx.user,
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
