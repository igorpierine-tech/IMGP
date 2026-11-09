import { eq, and, desc, sql, count } from "drizzle-orm";
import { portfolios, portfolioProjects, projects } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:read", ["project_coordinator", "it_director", "project_analyst"]);

    const url = new URL(request.url);
    const portfolioId = Number(url.searchParams.get("id"));

    if (portfolioId) {
      const [portfolio] = await ctx.db.select().from(portfolios).where(eq(portfolios.id, portfolioId)).limit(1);
      if (!portfolio) throw new HttpError(404, "Portfólio não encontrado.");

      const members = await ctx.db
        .select({
          id: portfolioProjects.id,
          projectId: portfolioProjects.projectId,
          strategicAlignment: portfolioProjects.strategicAlignment,
          priority: portfolioProjects.priority,
          projectName: projects.name,
          projectStatus: projects.status,
          projectHealth: projects.health,
          projectProgress: projects.progress,
          plannedCost: projects.plannedCost,
          actualCost: projects.actualCost,
          plannedStart: projects.plannedStart,
          plannedEnd: projects.plannedEnd,
        })
        .from(portfolioProjects)
        .innerJoin(projects, eq(portfolioProjects.projectId, projects.id))
        .where(eq(portfolioProjects.portfolioId, portfolioId))
        .orderBy(portfolioProjects.priority);

      const totalPlannedCost = members.reduce((s, m) => s + (m.plannedCost ?? 0), 0);
      const totalActualCost = members.reduce((s, m) => s + (m.actualCost ?? 0), 0);
      const avgProgress = members.length > 0 ? Math.round(members.reduce((s, m) => s + (m.projectProgress ?? 0), 0) / members.length) : 0;

      return Response.json({
        portfolio,
        projects: members,
        summary: { totalProjects: members.length, totalPlannedCost, totalActualCost, avgProgress },
      });
    }

    const all = await ctx.db.select().from(portfolios).where(eq(portfolios.active, true)).orderBy(portfolios.name);
    return Response.json({ portfolios: all });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", ["project_coordinator", "it_director"]);

    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "create");

    if (action === "create") {
      const name = String(body.name ?? "").trim();
      if (!name) throw new HttpError(400, "Nome é obrigatório.");

      const [portfolio] = await ctx.db.insert(portfolios).values({
        name,
        description: typeof body.description === "string" ? body.description.trim() : null,
        ownerUserId: typeof body.ownerUserId === "string" ? body.ownerUserId : null,
        createdBy: ctx.user.id,
      }).returning();

      await writeAudit({ actor: ctx.user, action: "portfolio.created", entityType: "portfolio", entityId: portfolio.id, requestId: request.headers.get("cf-ray"), after: portfolio });
      return Response.json({ portfolio }, { status: 201 });
    }

    if (action === "add_project") {
      const portfolioId = Number(body.portfolioId);
      const projectId = Number(body.projectId);
      if (!portfolioId || !projectId) throw new HttpError(400, "portfolioId e projectId são obrigatórios.");

      const [link] = await ctx.db.insert(portfolioProjects).values({
        portfolioId,
        projectId,
        strategicAlignment: typeof body.strategicAlignment === "string" ? body.strategicAlignment.trim() : null,
        priority: typeof body.priority === "number" ? body.priority : 0,
      }).returning();

      return Response.json({ portfolioProject: link }, { status: 201 });
    }

    if (action === "remove_project") {
      const portfolioId = Number(body.portfolioId);
      const projectId = Number(body.projectId);
      if (!portfolioId || !projectId) throw new HttpError(400, "portfolioId e projectId são obrigatórios.");

      await ctx.db.delete(portfolioProjects).where(
        and(eq(portfolioProjects.portfolioId, portfolioId), eq(portfolioProjects.projectId, projectId)),
      );
      return Response.json({ removed: true });
    }

    throw new HttpError(400, "Ação inválida.");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:update", ["project_coordinator", "it_director"]);
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID inválido.");
    const before = await ctx.db.select().from(portfolios).where(eq(portfolios.id, id)).limit(1);
    if (!before[0]) throw new HttpError(404, "Portfólio não encontrado.");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) throw new HttpError(400, "Nome é obrigatório.");
    const description = typeof body.description === "string" ? body.description.trim() : before[0].description;
    const [updated] = await ctx.db.update(portfolios).set({ name, description, updatedAt: new Date() }).where(eq(portfolios.id, id)).returning();
    await writeAudit({ actor: ctx.user, action: "portfolio.updated", entityType: "portfolio", entityId: id, requestId: request.headers.get("cf-ray"), before: before[0], after: updated });
    return Response.json({ portfolio: updated });
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
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID inválido.");
    const before = await ctx.db.select().from(portfolios).where(eq(portfolios.id, id)).limit(1);
    if (!before[0]) throw new HttpError(404, "Portfólio não encontrado.");
    await ctx.db.delete(portfolioProjects).where(eq(portfolioProjects.portfolioId, id));
    await ctx.db.delete(portfolios).where(eq(portfolios.id, id));
    await writeAudit({ actor: ctx.user, action: "portfolio.deleted", entityType: "portfolio", entityId: id, requestId: request.headers.get("cf-ray"), before: before[0], db: ctx.db });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
