import { eq } from "drizzle-orm";
import { getMasterDb } from "@/db";
import { tenants, tenantUsers, masterAuditEvents } from "@/db/master-schema";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { initializeTenantDb } from "@/lib/server/tenant-init";
import { hashPassword, validatePassword, normalizeEmail } from "@/lib/server/password-auth";
import { users } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const orgName = typeof body.orgName === "string" ? body.orgName.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";

    if (!orgName) throw new HttpError(400, "Nome da organização é obrigatório.");
    if (!slug) throw new HttpError(400, "Slug é obrigatório.");
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
      throw new HttpError(400, "Slug inválido. Use letras minúsculas, números e hífens.");
    }
    if (!displayName) throw new HttpError(400, "Nome completo é obrigatório.");
    if (!email) throw new HttpError(400, "E-mail inválido.");

    const passwordError = validatePassword(password);
    if (passwordError) throw new HttpError(400, passwordError);

    const masterDb = getMasterDb();

    const [existing] = await masterDb
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (existing) throw new HttpError(409, `O workspace "${slug}" já está em uso.`);

    const tenantId = crypto.randomUUID();
    const dbFileName = `tenant_${slug}.sqlite`;

    const [tenant] = await masterDb
      .insert(tenants)
      .values({
        id: tenantId,
        slug,
        name: orgName,
        dbFileName,
        status: "trial",
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning();

    const tenantDb = await initializeTenantDb(tenantId);

    const userId = crypto.randomUUID();
    const { hash, salt, iterations } = await hashPassword(password);

    await tenantDb.insert(users).values({
      id: userId,
      email,
      displayName,
      role: "project_coordinator",
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: iterations,
    });

    await masterDb.insert(tenantUsers).values({
      tenantId,
      email,
      externalUserId: userId,
    });

    await masterDb.insert(masterAuditEvents).values({
      actorEmail: email,
      action: "tenant.self_service_created",
      entityType: "tenant",
      entityId: tenantId,
      afterJson: JSON.stringify({ slug, orgName, email }),
    });

    return Response.json({
      message: "Workspace criado com sucesso!",
      tenant: { id: tenantId, slug, name: orgName },
      redirectTo: `/${slug}/login`,
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
