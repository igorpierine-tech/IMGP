import { eq } from "drizzle-orm";
import { getMasterDb } from "@/db";
import { tenants, masterAuditEvents } from "@/db/master-schema";
import { requireMasterUser, requireSuperAdmin } from "@/lib/server/master-auth";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { initializeTenantDb } from "@/lib/server/tenant-init";

export async function GET(request: Request) {
  try {
    const user = await requireMasterUser(request);
    const db = getMasterDb();
    const rows = await db.select().from(tenants).orderBy(tenants.name);
    return Response.json(rows);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: errorMessage(error) }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSuperAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const planId = typeof body.planId === "number" ? body.planId : null;
    const maxUsers = typeof body.maxUsers === "number" ? body.maxUsers : 10;
    const domain = typeof body.domain === "string" ? body.domain.trim() : null;

    if (!slug || !name) {
      throw new HttpError(400, "Slug e nome são obrigatórios.");
    }

    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
      throw new HttpError(400, "Slug inválido. Use letras minúsculas, números e hífens.");
    }

    const db = getMasterDb();

    const existing = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (existing[0]) {
      throw new HttpError(409, `Tenant com slug "${slug}" já existe.`);
    }

    const id = crypto.randomUUID();
    const dbFileName = `tenant_${slug}.sqlite`;

    const [created] = await db
      .insert(tenants)
      .values({
        id,
        slug,
        name,
        planId,
        maxUsers,
        domain,
        dbFileName,
        status: "trial",
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning();

    await db.insert(masterAuditEvents).values({
      actorUserId: user.id,
      actorEmail: user.email,
      action: "tenant.created",
      entityType: "tenant",
      entityId: id,
      afterJson: JSON.stringify(created),
    });

    await initializeTenantDb(id);

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
    const id = typeof body.id === "string" ? body.id : "";

    if (!id) throw new HttpError(400, "ID do tenant é obrigatório.");

    const db = getMasterDb();
    const existing = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!existing[0]) throw new HttpError(404, "Tenant não encontrado.");

    const allowed: (keyof typeof tenants.$inferInsert)[] = [
      "name", "status", "planId", "maxUsers", "domain", "settingsJson",
    ];
    const filtered: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in body) filtered[key] = body[key];
    }

    await db.update(tenants).set(filtered).where(eq(tenants.id, id));

    await db.insert(masterAuditEvents).values({
      actorUserId: user.id,
      actorEmail: user.email,
      action: "tenant.updated",
      entityType: "tenant",
      entityId: id,
      beforeJson: JSON.stringify(existing[0]),
      afterJson: JSON.stringify(filtered),
    });

    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: errorMessage(error) }, { status });
  }
}
