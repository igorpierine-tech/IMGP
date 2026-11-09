import { eq, sql } from "drizzle-orm";
import { projectItems } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director", "project_analyst"]);

    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const itemIds = Array.isArray(body.itemIds) ? body.itemIds.filter((id): id is number => typeof id === "number" && id > 0) : [];

    if (itemIds.length === 0) throw new HttpError(400, "Selecione ao menos um item.");
    if (itemIds.length > 100) throw new HttpError(400, "Máximo de 100 itens por operação.");

    if (action === "update_status") {
      const newStatus = String(body.status ?? "");
      const validStatuses = ["planned", "in_progress", "blocked", "review", "done"];
      if (!validStatuses.includes(newStatus)) {
        throw new HttpError(400, `Status inválido. Use: ${validStatuses.join(", ")}`);
      }

      let updated = 0;
      for (const id of itemIds) {
        const result = await ctx.db
          .update(projectItems)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(projectItems.id, id));
        updated++;
      }

      await writeAudit({
        actor: ctx.user,
        action: "bulk.status_updated",
        entityType: "project_item",
        requestId: request.headers.get("cf-ray"),
        metadata: { itemIds, newStatus, count: updated },
      });

      return Response.json({ updated, status: newStatus });
    }

    if (action === "update_assignee") {
      const assignedUserId = typeof body.assignedUserId === "string" ? body.assignedUserId : null;
      const assignedName = typeof body.assignedName === "string" ? body.assignedName : null;

      let updated = 0;
      for (const id of itemIds) {
        await ctx.db
          .update(projectItems)
          .set({ assignedUserId, assignedName, updatedAt: new Date() })
          .where(eq(projectItems.id, id));
        updated++;
      }

      await writeAudit({
        actor: ctx.user,
        action: "bulk.assignee_updated",
        entityType: "project_item",
        requestId: request.headers.get("cf-ray"),
        metadata: { itemIds, assignedUserId, count: updated },
      });

      return Response.json({ updated, assignedUserId });
    }

    if (action === "move_sprint") {
      const sprintId = Number(body.sprintId);
      if (!Number.isInteger(sprintId)) throw new HttpError(400, "sprintId inválido.");

      let updated = 0;
      for (const id of itemIds) {
        await ctx.db
          .update(projectItems)
          .set({ sprintId: sprintId || null, updatedAt: new Date() })
          .where(eq(projectItems.id, id));
        updated++;
      }

      await writeAudit({
        actor: ctx.user,
        action: "bulk.sprint_moved",
        entityType: "project_item",
        requestId: request.headers.get("cf-ray"),
        metadata: { itemIds, sprintId, count: updated },
      });

      return Response.json({ updated, sprintId });
    }

    if (action === "delete") {
      checkPermissionOrRole(ctx, "projects:delete", ["project_coordinator", "it_director"]);

      let deleted = 0;
      for (const id of itemIds) {
        await ctx.db.delete(projectItems).where(eq(projectItems.id, id));
        deleted++;
      }

      await writeAudit({
        actor: ctx.user,
        action: "bulk.deleted",
        entityType: "project_item",
        requestId: request.headers.get("cf-ray"),
        metadata: { itemIds, count: deleted },
      });

      return Response.json({ deleted });
    }

    throw new HttpError(400, "Ação inválida. Use: update_status, update_assignee, move_sprint, delete.");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
