import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { normalizeEmail, verifyPassword } from "@/lib/server/password-auth";
import { signJwt } from "@/lib/server/jwt";
import { resolveTenant } from "@/lib/server/tenant-context";
import { HttpError } from "@/lib/server/errors";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const tenantSlug = typeof body.tenantSlug === "string" ? body.tenantSlug.trim() : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Informe o e-mail e a senha." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user?.passwordHash || !user.passwordSalt || !user.active) {
    return NextResponse.json(
      { error: "E-mail ou senha inválidos." },
      { status: 401 },
    );
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Acesso temporariamente bloqueado. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }

  const valid = await verifyPassword(
    password,
    user.passwordSalt,
    user.passwordHash,
    user.passwordIterations,
  );

  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    await db
      .update(users)
      .set({
        failedLoginAttempts: attempts >= 5 ? 0 : attempts,
        lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      })
      .where(eq(users.id, user.id));
    return NextResponse.json(
      { error: "E-mail ou senha inválidos." },
      { status: 401 },
    );
  }

  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastSeenAt: new Date() })
    .where(eq(users.id, user.id));

  let tenantId: string | undefined;
  let resolvedSlug: string | undefined;

  if (tenantSlug) {
    try {
      const tenant = await resolveTenant(tenantSlug);
      tenantId = tenant.id;
      resolvedSlug = tenant.slug;
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 400;
      const message = err instanceof HttpError ? err.message : "Tenant não encontrado.";
      return NextResponse.json({ error: message }, { status });
    }
  }

  const currentUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };

  try {
    const token = await signJwt(currentUser, tenantId, resolvedSlug);
    return NextResponse.json({ token, expiresIn: 8 * 60 * 60 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar token.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
