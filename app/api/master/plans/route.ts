import { eq } from "drizzle-orm";
import { getMasterDb } from "@/db";
import { plans, planModules, masterAuditEvents } from "@/db/master-schema";
import { requireMasterUser, requireSuperAdmin } from "@/lib/server/master-auth";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    await requireMasterUser(request);
    const db = getMasterDb();

    const allPlans = await db.select().from(plans).orderBy(plans.name);
    const allModules = await db.select().from(planModules);

    const result = allPlans.map((plan) => ({
      ...plan,
      modules: allModules
        .filter((m) => m.planId === plan.id)
        .map((m) => ({
          moduleKey: m.moduleKey,
          actions: JSON.parse(m.actionsJson),
        })),
    }));

    return Response.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: errorMessage(error) }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSuperAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const maxUsers = typeof body.maxUsers === "number" ? body.maxUsers : 10;
    const priceMonthly = typeof body.priceMonthly === "number" ? body.priceMonthly : 0;
    const moduleDefs = Array.isArray(body.modules) ? body.modules : null;

    if (!name) throw new HttpError(400, "Nome do plano é obrigatório.");

    const db = getMasterDb();

    const existing = await db
      .select()
      .from(plans)
      .where(eq(plans.name, name))
      .limit(1);

    if (existing[0]) throw new HttpError(409, `Plano "${name}" já existe.`);

    const [created] = await db
      .insert(plans)
      .values({
        name,
        description,
        maxUsers,
        priceMonthly,
      })
      .returning();

    if (moduleDefs) {
      for (const mod of moduleDefs as Record<string, unknown>[]) {
        if (!mod.moduleKey) continue;
        await db.insert(planModules).values({
          planId: created.id,
          moduleKey: String(mod.moduleKey),
          actionsJson: JSON.stringify(mod.actions ?? ["read"]),
        });
      }
    }

    await db.insert(masterAuditEvents).values({
      actorUserId: user.id,
      actorEmail: user.email,
      action: "plan.created",
      entityType: "plan",
      entityId: String(created.id),
      afterJson: JSON.stringify(created),
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: errorMessage(error) }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSuperAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    const patchModules = Array.isArray(body.modules) ? body.modules as Record<string, unknown>[] : null;

    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID do plano é obrigatório.");

    const db = getMasterDb();
    const existing = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);

    if (!existing[0]) throw new HttpError(404, "Plano não encontrado.");

    const allowed: (keyof typeof plans.$inferInsert)[] = [
      "name", "description", "maxUsers", "priceMonthly", "active",
    ];
    const filtered: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in body) filtered[key] = body[key];
    }

    await db.update(plans).set(filtered).where(eq(plans.id, id));

    if (patchModules) {
      await db.delete(planModules).where(eq(planModules.planId, id));
      for (const mod of patchModules) {
        if (!mod.moduleKey) continue;
        await db.insert(planModules).values({
          planId: id,
          moduleKey: String(mod.moduleKey),
          actionsJson: JSON.stringify(mod.actions ?? ["read"]),
        });
      }
    }

    await db.insert(masterAuditEvents).values({
      actorUserId: user.id,
      actorEmail: user.email,
      action: "plan.updated",
      entityType: "plan",
      entityId: String(id),
      beforeJson: JSON.stringify(existing[0]),
      afterJson: JSON.stringify(filtered),
    });

    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: errorMessage(error) }, { status });
  }
}
