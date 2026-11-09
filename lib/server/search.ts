import { sql, or, like } from "drizzle-orm";
import { projects, projectItems, demands } from "../../db/schema";
import type { ApiContext } from "./api-context";
import { HttpError } from "./errors";

type SearchResult = {
  type: "project" | "task" | "demand";
  id: number;
  name: string;
  status: string;
  extra: string;
};

export async function globalSearch(ctx: ApiContext, query: string, limit = 20): Promise<SearchResult[]> {
  if (!query || query.length < 2) throw new HttpError(400, "Busca deve ter pelo menos 2 caracteres.");
  if (query.length > 200) throw new HttpError(400, "Termo de busca muito longo.");

  const term = `%${query}%`;
  const results: SearchResult[] = [];

  const projectRows = await ctx.db
    .select({ id: projects.id, name: projects.name, status: projects.status, area: projects.area, code: projects.code })
    .from(projects)
    .where(or(
      like(projects.name, term),
      like(projects.code, term),
      like(projects.area, term),
    ))
    .limit(limit);

  for (const p of projectRows) {
    results.push({ type: "project", id: p.id, name: p.name, status: p.status, extra: p.area ?? "" });
  }

  const taskRows = await ctx.db
    .select({
      id: projectItems.id,
      name: projectItems.name,
      status: projectItems.status,
      kind: projectItems.kind,
      assignedName: projectItems.assignedName,
    })
    .from(projectItems)
    .where(or(
      like(projectItems.name, term),
      like(projectItems.assignedName, term),
      like(projectItems.groupName, term),
    ))
    .limit(limit);

  for (const t of taskRows) {
    results.push({ type: "task", id: t.id, name: t.name, status: t.status, extra: `${t.kind} — ${t.assignedName ?? ""}` });
  }

  const demandRows = await ctx.db
    .select({ id: demands.id, name: demands.name, stage: demands.stage, area: demands.area })
    .from(demands)
    .where(or(
      like(demands.name, term),
      like(demands.area, term),
      like(demands.objective, term),
    ))
    .limit(limit);

  for (const d of demandRows) {
    results.push({ type: "demand", id: d.id, name: d.name, status: d.stage, extra: d.area });
  }

  return results.slice(0, limit);
}
