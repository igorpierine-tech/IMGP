import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createPasswordSession, normalizeEmail, passwordSessionCookieName, passwordSessionCookieOptions, verifyPassword } from "@/lib/server/password-auth";
import { safeReturnPath } from "@/lib/server/entra-auth";
import { appUrl } from "@/lib/app-path";
import { extractTenantSlug, resolveTenant } from "@/lib/server/tenant-context";
import { verifyCsrfToken } from "@/lib/server/csrf";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") || "");
  const returnTo = safeReturnPath(String(form.get("returnTo") || "/painel"));
  const fail = (message: string) => NextResponse.redirect(appUrl(`/login?error=${encodeURIComponent(message)}&return_to=${encodeURIComponent(returnTo)}`, request.url), 303);

  const csrfError = await verifyCsrfToken(request, form.get("_csrf") as string | null);
  if (csrfError) return fail(csrfError);

  if (!email || !password) return fail("Informe o e-mail e a senha.");

  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user?.passwordHash || !user.passwordSalt || !user.active) return fail("E-mail ou senha inválidos.");
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return fail("Acesso temporariamente bloqueado. Tente novamente em alguns minutos.");

  const valid = await verifyPassword(password, user.passwordSalt, user.passwordHash, user.passwordIterations);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    await getDb().update(users).set({
      failedLoginAttempts: attempts >= 5 ? 0 : attempts,
      lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
    }).where(eq(users.id, user.id));
    return fail("E-mail ou senha inválidos.");
  }

  let tenantId: string | undefined;
  const slug = extractTenantSlug(request) || extractSlugFromReturnPath(returnTo);
  if (slug) {
    try {
      const tenant = await resolveTenant(slug);
      tenantId = tenant.id;
    } catch {
      // Tenant not found — session created without tenant binding
    }
  }

  await getDb().update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastSeenAt: new Date() }).where(eq(users.id, user.id));
  const session = await createPasswordSession(user.id, tenantId);
  const response = NextResponse.redirect(appUrl(user.mustChangePassword ? "/alterar-senha" : returnTo, request.url), 303);
  response.cookies.set(passwordSessionCookieName(), session, passwordSessionCookieOptions());
  return response;
}

function extractSlugFromReturnPath(returnTo: string): string | null {
  const match = returnTo.match(/\/t\/([^/]+)/);
  return match?.[1] ?? null;
}
