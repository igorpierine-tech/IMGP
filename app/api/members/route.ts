import { asc, eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { HttpError } from "@/lib/server/authz";
import { errorMessage } from "@/lib/server/errors";
import { getApiContext } from "@/lib/server/api-context";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const rows = await ctx.db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(eq(users.active, true))
      .orderBy(asc(users.displayName));
    return Response.json({ members: rows });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error) },
      { status: error instanceof HttpError ? error.status : 500 },
    );
  }
}
