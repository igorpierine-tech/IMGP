import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { userSessions, users } from "@/db/schema";
import { requireApiUser } from "@/lib/server/authz";
import { createPasswordSession, hashPassword, passwordSessionCookieName, passwordSessionCookieOptions, validatePassword, verifyPassword } from "@/lib/server/password-auth";
import { appUrl } from "@/lib/app-path";

export async function POST(request: Request) {
  const user = await requireApiUser();
  const form = await request.formData();
  const currentPassword = String(form.get("currentPassword") || "");
  const password = String(form.get("password") || "");
  const confirmation = String(form.get("confirmation") || "");
  const fail = (message: string) => NextResponse.redirect(appUrl(`/alterar-senha?error=${encodeURIComponent(message)}`, request.url), 303);
  const [stored] = await getDb().select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!stored?.passwordHash || !stored.passwordSalt) return fail("Esta conta utiliza autenticação corporativa.");
  if (!await verifyPassword(currentPassword, stored.passwordSalt, stored.passwordHash, stored.passwordIterations)) return fail("A senha atual não confere.");
  const passwordError = validatePassword(password);
  if (passwordError) return fail(passwordError);
  if (password !== confirmation) return fail("A confirmação da nova senha não confere.");
  const data = await hashPassword(password);
  await getDb().update(users).set({ passwordHash: data.hash, passwordSalt: data.salt, passwordIterations: data.iterations, passwordSetAt: new Date(), mustChangePassword: false }).where(eq(users.id, user.id));
  await getDb().delete(userSessions).where(eq(userSessions.userId, user.id));
  const session = await createPasswordSession(user.id);
  const response = NextResponse.redirect(appUrl("/legacy", request.url), 303);
  response.cookies.set(passwordSessionCookieName(), session, passwordSessionCookieOptions());
  return response;
}
