import { eq, desc } from "drizzle-orm";
import { projectTemplates, templateItems, projects, projectItems } from "../../db/schema";
import type { ApiContext } from "./api-context";
import { HttpError } from "./errors";

export async function createProjectFromTemplate(
  ctx: ApiContext,
  templateId: number,
  projectName: string,
  startDate: string,
): Promise<typeof projects.$inferSelect> {
  const [template] = await ctx.db
    .select()
    .from(projectTemplates)
    .where(eq(projectTemplates.id, templateId))
    .limit(1);

  if (!template || !template.active) throw new HttpError(404, "Template não encontrado ou inativo.");

  const [project] = await ctx.db.insert(projects).values({
    name: projectName,
    projectTypeId: template.projectTypeId,
    status: "planning",
    plannedStart: startDate,
  }).returning();

  const items = await ctx.db
    .select()
    .from(templateItems)
    .where(eq(templateItems.templateId, templateId))
    .orderBy(templateItems.sequence);

  const refToId = new Map<string, number>();

  for (const item of items) {
    const plannedStart = addDays(startDate, item.relativeStartDays);
    const plannedEnd = addDays(plannedStart, item.durationDays);
    const parentId = item.parentRef ? refToId.get(item.parentRef) ?? null : null;

    const [created] = await ctx.db.insert(projectItems).values({
      projectId: project.id,
      kind: item.kind as "milestone" | "task" | "subtask",
      name: item.name,
      status: "planned",
      plannedStart,
      plannedEnd,
      parentId,
    }).returning();

    if (item.itemRef) refToId.set(item.itemRef, created.id);
  }

  return project;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
