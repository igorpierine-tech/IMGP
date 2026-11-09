import { eq, and, desc } from "drizzle-orm";
import { taskRecurrences, projectItems } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

function computeNextOccurrence(frequency: string, interval: number, from: string, dayOfWeek?: number, dayOfMonth?: number): string {
  const d = new Date(from);
  switch (frequency) {
    case "daily": d.setDate(d.getDate() + interval); break;
    case "weekly": d.setDate(d.getDate() + 7 * interval); break;
    case "monthly":
      d.setMonth(d.getMonth() + interval);
      if (dayOfMonth) d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
      break;
    default: d.setDate(d.getDate() + 7);
  }
  return d.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const itemId = Number(url.searchParams.get("itemId"));

    if (itemId) {
      const rules = await ctx.db.select().from(taskRecurrences).where(eq(taskRecurrences.sourceItemId, itemId));
      return Response.json({ recurrences: rules });
    }

    const all = await ctx.db.select().from(taskRecurrences).where(eq(taskRecurrences.active, true)).orderBy(taskRecurrences.nextOccurrence);
    return Response.json({ recurrences: all });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", ["project_coordinator", "it_director", "project_analyst"]);

    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "create");

    if (action === "create") {
      const sourceItemId = Number(body.sourceItemId);
      const frequency = String(body.frequency ?? "weekly");
      const interval = Number(body.interval) || 1;

      if (!sourceItemId) throw new HttpError(400, "sourceItemId é obrigatório.");
      if (!["daily", "weekly", "monthly"].includes(frequency)) throw new HttpError(400, "Frequência inválida.");

      const [item] = await ctx.db.select().from(projectItems).where(eq(projectItems.id, sourceItemId)).limit(1);
      if (!item) throw new HttpError(404, "Tarefa não encontrada.");

      const today = new Date().toISOString().split("T")[0];
      const nextOccurrence = computeNextOccurrence(frequency, interval, today, Number(body.dayOfWeek) || undefined, Number(body.dayOfMonth) || undefined);

      const [rule] = await ctx.db.insert(taskRecurrences).values({
        sourceItemId,
        frequency,
        intervalValue: interval,
        dayOfWeek: typeof body.dayOfWeek === "number" ? body.dayOfWeek : null,
        dayOfMonth: typeof body.dayOfMonth === "number" ? body.dayOfMonth : null,
        nextOccurrence,
        maxOccurrences: typeof body.maxOccurrences === "number" ? body.maxOccurrences : null,
        createdBy: ctx.user.id,
      }).returning();

      return Response.json({ recurrence: rule }, { status: 201 });
    }

    if (action === "generate") {
      const recurrenceId = Number(body.recurrenceId);
      if (!recurrenceId) throw new HttpError(400, "recurrenceId é obrigatório.");

      const [rule] = await ctx.db.select().from(taskRecurrences).where(eq(taskRecurrences.id, recurrenceId)).limit(1);
      if (!rule || !rule.active) throw new HttpError(404, "Recorrência não encontrada ou inativa.");
      if (rule.maxOccurrences && rule.occurrencesCreated >= rule.maxOccurrences) {
        throw new HttpError(400, "Limite de ocorrências atingido.");
      }

      const [source] = await ctx.db.select().from(projectItems).where(eq(projectItems.id, rule.sourceItemId)).limit(1);
      if (!source) throw new HttpError(404, "Tarefa origem não encontrada.");

      const [newItem] = await ctx.db.insert(projectItems).values({
        projectId: source.projectId,
        sprintId: source.sprintId,
        kind: source.kind,
        name: source.name,
        status: "planned",
        assignedUserId: source.assignedUserId,
        assignedName: source.assignedName,
        plannedStart: rule.nextOccurrence,
        plannedHours: source.plannedHours,
      }).returning();

      const nextOcc = computeNextOccurrence(rule.frequency, rule.intervalValue, rule.nextOccurrence!, rule.dayOfWeek ?? undefined, rule.dayOfMonth ?? undefined);
      await ctx.db.update(taskRecurrences).set({
        nextOccurrence: nextOcc,
        occurrencesCreated: rule.occurrencesCreated + 1,
      }).where(eq(taskRecurrences.id, recurrenceId));

      return Response.json({ item: newItem, nextOccurrence: nextOcc }, { status: 201 });
    }

    throw new HttpError(400, "Ação inválida.");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:delete", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!id) throw new HttpError(400, "ID é obrigatório.");

    await ctx.db.update(taskRecurrences).set({ active: false }).where(eq(taskRecurrences.id, id));
    return Response.json({ deactivated: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
