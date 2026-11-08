import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../db";
import { userSessions, users } from "../../db/schema";
import { APP_BASE_PATH } from "../app-path";

const SESSION_COOKIE = "bj_local_session";
const SESSION_SECONDS = 8 * 60 * 60;
// Cloudflare Workers Web Crypto currently caps PBKDF2 at 100,000 iterations.
export const PASSWORD_ITERATIONS = 100000;

export async function getPasswordUser() {
  const rawToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;
  const sessionId = await sha256Hex(rawToken);
  const now = new Date();
  const [row] = await getDb()
    .select({ user: users, session: userSessions })
    .from(userSessions)
    .innerJoin(users, eq(users.id, userSessions.userId))
    .where(and(eq(userSessions.id, sessionId), gt(userSessions.expiresAt, now)))
    .limit(1);
  if (!row?.user.active) return null;
  await getDb().batch([
    getDb().update(userSessions).set({ lastSeenAt: now }).where(eq(userSessions.id, sessionId)),
    getDb().update(users).set({ lastSeenAt: now }).where(eq(users.id, row.user.id)),
  ]);
  return { ...row.user, sessionTenantId: row.session.tenantId };
}

export async function createPasswordSession(userId: string, tenantId?: string) {
  const rawToken = randomToken(32);
  const id = await sha256Hex(rawToken);
  await getDb().insert(userSessions).values({
    id,
    userId,
    tenantId: tenantId ?? null,
    expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
  });
  return rawToken;
}

export async function destroyPasswordSession(rawToken: string | undefined) {
  if (!rawToken) return;
  await getDb().delete(userSessions).where(eq(userSessions.id, await sha256Hex(rawToken)));
}

export async function hashPassword(password: string, salt = randomToken(18)) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64Url(salt), iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return { hash: base64Url(new Uint8Array(bits)), salt, iterations: PASSWORD_ITERATIONS };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64Url(salt), iterations },
    key,
    256,
  );
  return timingSafeEqual(base64Url(new Uint8Array(bits)), expectedHash);
}

export function validatePassword(password: string) {
  if (password.length < 10 || password.length > 128) return "A senha deve ter entre 10 e 128 caracteres.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Use ao menos uma letra maiúscula, uma minúscula e um número.";
  }
  return null;
}

export function normalizeEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function passwordSessionCookieName() {
  return SESSION_COOKIE;
}

export function passwordSessionCookieOptions(maxAge = SESSION_SECONDS) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: APP_BASE_PATH, maxAge };
}

function randomToken(bytes: number) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function sha256Hex(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}
