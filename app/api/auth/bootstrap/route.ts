import { count, eq, isNotNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createPasswordSession, hashPassword, normalizeEmail, passwordSessionCookieName, passwordSessionCookieOptions, validatePassword } from "@/lib/server/password-auth";
import { appUrl } from "@/lib/app-path";
import { verifyCsrfToken } from "@/lib/server/csrf";

export async function POST(request: Request) {
  const form = await request.formData();
  const csrfError = await verifyCsrfToken(request, form.get("_csrf") as string | null);
  if (csrfError) {
    return NextResponse.redirect(appUrl(`/login?setup=1&error=${encodeURIComponent(csrfError)}`, request.url), 303);
  }
  const token = String(form.get("setupToken") || "");
  const cfEnv = env as unknown as Record<string, string | undefined>;
  const expectedToken = cfEnv.AUTH_BOOTSTRAP_TOKEN || process.env.AUTH_BOOTSTRAP_TOKEN || "";
  const email = normalizeEmail(form.get("email"));
  const allowedEmail = normalizeEmail(cfEnv.BOOTSTRAP_ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL);
  const password = String(form.get("password") || "");
  const confirmation = String(form.get("confirmation") || "");
  const fail = (message: string) => NextResponse.redirect(appUrl(`/login?setup=1&error=${encodeURIComponent(message)}`, request.url), 303);
  const [{ value }] = await getDb().select({ value: count() }).from(users).where(isNotNull(users.passwordHash));
  if (value > 0) return fail("O primeiro acesso já foi configurado.");
  if (!expectedToken || !timingSafeEqual(token, expectedToken)) return fail("Link de primeiro acesso inválido ou expirado.");
  if (!email || !allowedEmail || email !== allowedEmail) return fail("Use o e-mail corporativo autorizado para o primeiro acesso.");
  const passwordError = validatePassword(password);
  if (passwordError) return fail(passwordError);
  if (password !== confirmation) return fail("A confirmação da senha não confere.");

  const passwordData = await hashPassword(password);
  const [existing] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  const userId = existing?.id || `local:${crypto.randomUUID()}`;
  if (existing) {
    await getDb().update(users).set({
      displayName: String(form.get("displayName") || "Coordenador de Projetos").trim(),
      role: "project_coordinator",
      active: true,
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      passwordIterations: passwordData.iterations,
      passwordSetAt: new Date(),
      mustChangePassword: false,
    }).where(eq(users.id, existing.id));
  } else {
    await getDb().insert(users).values({
      id: userId,
      email,
      displayName: String(form.get("displayName") || "Coordenador de Projetos").trim(),
      role: "project_coordinator",
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      passwordIterations: passwordData.iterations,
      passwordSetAt: new Date(),
    });
  }
  const session = await createPasswordSession(userId);
  const response = NextResponse.redirect(appUrl("/painel", request.url), 303);
  response.cookies.set(passwordSessionCookieName(), session, passwordSessionCookieOptions());
  return response;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}
