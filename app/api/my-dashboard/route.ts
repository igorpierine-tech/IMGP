import { sql, eq, and, desc, gte, count } from "drizzle-orm";
import { projectItems, timeEntries, notifications, projects, favorites } from "@/db/schema";
import { getApiContext } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const userId = ctx.user.id;
    const now = Date.now();
    const sevenDaysFromNow = new Date(now + 7 * 86_400_000).toISOString().split("T")[0];

    const myTasks = await ctx.db
      .select()
      .from(projectItems)
      .where(and(eq(projectItems.assignedUserId, userId), sql`${projectItems.status} != 'done'`))
      .orderBy(projectItems.plannedEnd)
      .limit(20);

    const upcomingDeadlines = await ctx.db
      .select({
        id: projectItems.id,
        name: projectItems.name,
        status: projectItems.status,
        plannedEnd: projectItems.plannedEnd,
        projectId: projectItems.projectId,
      })
      .from(projectItems)
      .where(and(
        eq(projectItems.assignedUserId, userId),
        sql`${projectItems.status} != 'done'`,
        sql`${projectItems.plannedEnd} <= ${sevenDaysFromNow}`,
        sql`${projectItems.plannedEnd} IS NOT NULL`,
      ))
      .orderBy(projectItems.plannedEnd)
      .limit(10);

    const recentTimeEntries = await ctx.db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, userId))
      .orderBy(desc(timeEntries.startedAt))
      .limit(5);

    const [unreadCount] = await ctx.db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    const recentNotifications = await ctx.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    const userFavorites = await ctx.db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
      .limit(10);

    const [taskSummary] = await ctx.db
      .select({
        total: count(),
        inProgress: count(sql`CASE WHEN ${projectItems.status} = 'in_progress' THEN 1 END`),
        blocked: count(sql`CASE WHEN ${projectItems.status} = 'blocked' THEN 1 END`),
        done: count(sql`CASE WHEN ${projectItems.status} = 'done' THEN 1 END`),
      })
      .from(projectItems)
      .where(eq(projectItems.assignedUserId, userId));

    return Response.json({
      myTasks,
      upcomingDeadlines,
      recentTimeEntries,
      unreadNotifications: unreadCount?.count ?? 0,
      recentNotifications,
      favorites: userFavorites,
      taskSummary,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
