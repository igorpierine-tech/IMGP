import { count, eq, like } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getEntraUser } from "./entra-auth";
import { getPasswordUser } from "./password-auth";
import { getDb } from "../../db";
import { users } from "../../db/schema";

export const roles = [
  "project_coordinator",
  "it_director",
  "project_analyst",
  "keyuser",
  "requester",
  "area_manager",
  "viewer",
] as const;

export type AppRole = (typeof roles)[number];
export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const local = await getPasswordUser();
  if (local) return {
    id: local.id,
    email: local.email,
    displayName: local.displayName,
    role: local.role,
  };

  const identity = await getEntraUser();
  if (!identity) return null;

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.id, identity.userId)).limit(1);
  if (existing[0]) {
    if (!existing[0].active) throw new HttpError(403, "Usuário inativo.");
    await db.update(users).set({
      email: identity.email,
      displayName: identity.displayName,
      lastSeenAt: new Date(),
    }).where(eq(users.id, identity.userId));
    return {
      id: existing[0].id,
      email: identity.email,
      displayName: identity.displayName,
      role: existing[0].role,
    };
  }

  const [{ value }] = await db.select({ value: count() }).from(users).where(like(users.id, "entra:%"));
  const role: AppRole = value === 0 ? "project_coordinator" : "keyuser";
  await db.insert(users).values({
    id: identity.userId,
    email: identity.email,
    displayName: identity.displayName,
    role,
    lastSeenAt: new Date(),
  });
  return { id: identity.userId, email: identity.email, displayName: identity.displayName, role };
}

export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Usuário não autenticado.");
  return user;
}

export async function requirePageUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?return_to=${encodeURIComponent(returnTo)}`);
  return user;
}

export function requireRole(user: CurrentUser, allowed: readonly AppRole[]) {
  if (!allowed.includes(user.role)) {
    throw new HttpError(403, "Seu perfil não possui permissão para esta operação.");
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
