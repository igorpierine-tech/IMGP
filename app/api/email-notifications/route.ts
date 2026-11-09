import { eq, and, desc } from "drizzle-orm";
import { notifications, users } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { sendNotificationEmail } from "@/lib/server/email";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter((id): id is string => typeof id === "string") : [];
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.body === "string" ? body.body.trim() : "";
    const entityUrl = typeof body.entityUrl === "string" ? body.entityUrl.trim() : undefined;

    if (!title) throw new HttpError(400, "Título é obrigatório.");
    if (!message) throw new HttpError(400, "Mensagem é obrigatória.");
    if (userIds.length === 0) throw new HttpError(400, "Selecione ao menos um destinatário.");
    if (userIds.length > 50) throw new HttpError(400, "Máximo de 50 destinatários por vez.");

    const targetUsers = await ctx.db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.active, true));

    const validUsers = targetUsers.filter(u => userIds.includes(u.id));
    if (validUsers.length === 0) throw new HttpError(400, "Nenhum destinatário válido encontrado.");

    const results: { userId: string; email: string; sent: boolean }[] = [];

    for (const user of validUsers) {
      const sent = await sendNotificationEmail(user.email, title, message, entityUrl);
      results.push({ userId: user.id, email: user.email, sent });
    }

    return Response.json({
      sent: results.filter(r => r.sent).length,
      failed: results.filter(r => !r.sent).length,
      details: results,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
