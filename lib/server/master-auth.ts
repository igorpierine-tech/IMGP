import { eq } from "drizzle-orm";
import { getMasterDb } from "../../db";
import { masterUsers, masterSessions } from "../../db/master-schema";
import { HttpError } from "./errors";

const SESSION_COOKIE = "imgp_master_session";
const SESSION_SECONDS = 8 * 60 * 60;
const PASSWORD_ITERATIONS = 100000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export type MasterUser = {
  id: string;
  email: string;
  displayName: string;
  role: "super_admin" | "support";
};

export async function getMasterUser(request: Request): Promise<MasterUser | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;

  const token = match[1];
  const tokenHash = await hashToken(token);

  const db = getMasterDb();
  const rows = await db
    .select()
    .from(masterSessions)
    .where(eq(masterSessions.id, tokenHash))
    .limit(1);

  if (!rows[0] || rows[0].expiresAt < new Date()) return null;

  const userRows = await db
    .select()
    .from(masterUsers)
    .where(eq(masterUsers.id, rows[0].userId))
    .limit(1);

  if (!userRows[0] || !userRows[0].active) return null;

  return {
    id: userRows[0].id,
    email: userRows[0].email,
    displayName: userRows[0].displayName,
    role: userRows[0].role,
  };
}

export async function requireMasterUser(request: Request): Promise<MasterUser> {
  const user = await getMasterUser(request);
  if (!user) throw new HttpError(401, "Autenticação master necessária.");
  return user;
}

export async function requireSuperAdmin(request: Request): Promise<MasterUser> {
  const user = await requireMasterUser(request);
  if (user.role !== "super_admin") {
    throw new HttpError(403, "Acesso restrito a super administradores.");
  }
  return user;
}

export async function masterLogin(
  email: string,
  password: string,
): Promise<{ token: string; expiresAt: Date }> {
  const db = getMasterDb();
  const rows = await db
    .select()
    .from(masterUsers)
    .where(eq(masterUsers.email, email.toLowerCase().trim()))
    .limit(1);

  if (!rows[0]) throw new HttpError(401, "Credenciais inválidas.");

  const user = rows[0];
  if (!user.active) throw new HttpError(403, "Conta desativada.");

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new HttpError(
      429,
      `Conta bloqueada. Tente novamente após ${LOCKOUT_MINUTES} minutos.`,
    );
  }

  if (!user.passwordHash || !user.passwordSalt) {
    throw new HttpError(401, "Credenciais inválidas.");
  }

  const valid = await verifyPassword(
    password,
    user.passwordHash,
    user.passwordSalt,
    user.passwordIterations,
  );

  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const updates: Record<string, unknown> = { failedLoginAttempts: attempts };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      updates.failedLoginAttempts = 0;
    }
    await db.update(masterUsers).set(updates).where(eq(masterUsers.id, user.id));
    throw new HttpError(401, "Credenciais inválidas.");
  }

  await db
    .update(masterUsers)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastSeenAt: new Date() })
    .where(eq(masterUsers.id, user.id));

  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);

  await db.insert(masterSessions).values({
    id: tokenHash,
    userId: user.id,
    expiresAt,
  });

  return { token, expiresAt };
}

export function masterSessionCookie(token: string, expiresAt: Date): string {
  return `${SESSION_COOKIE}=${token}; Path=/Projetos; HttpOnly; Secure; SameSite=Lax; Expires=${expiresAt.toUTCString()}`;
}

export function masterLogoutCookie(): string {
  return `${SESSION_COOKIE}=; Path=/Projetos; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(
  password: string,
): Promise<{ hash: string; salt: string; iterations: number }> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const hash = Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  return { hash, salt, iterations: PASSWORD_ITERATIONS };
}

async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
  iterations: number,
): Promise<boolean> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(storedSalt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const computed = Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  return computed === storedHash;
}
