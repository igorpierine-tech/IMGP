import { env } from "cloudflare:workers";
import type { CurrentUser, AppRole } from "./authz";

const ALG = "HS256";
const TOKEN_SECONDS = 8 * 60 * 60;

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  role: AppRole;
  tid?: string;
  ts?: string;
  iat: number;
  exp: number;
};

export async function signJwt(
  user: CurrentUser,
  tenantId?: string,
  tenantSlug?: string,
  lifetimeSeconds = TOKEN_SECONDS,
): Promise<string> {
  const secret = requireSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.displayName,
    role: user.role,
    ...(tenantId ? { tid: tenantId } : {}),
    ...(tenantSlug ? { ts: tenantSlug } : {}),
    iat: now,
    exp: now + lifetimeSeconds,
  };
  const header = base64Url(JSON.stringify({ alg: ALG, typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = await hmac(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  const secret = requireSecret();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Token JWT malformado.");

  const expectedSig = await hmac(`${parts[0]}.${parts[1]}`, secret);
  if (!timingSafeEqual(parts[2], expectedSig)) {
    throw new Error("Assinatura JWT inválida.");
  }

  const payload = JSON.parse(
    new TextDecoder().decode(fromBase64Url(parts[1])),
  ) as JwtPayload;

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) throw new Error("Token JWT expirado.");
  if (payload.iat && payload.iat > now + 60) throw new Error("Token JWT emitido no futuro.");
  if (!payload.sub || !payload.email || !payload.role) {
    throw new Error("Token JWT incompleto.");
  }

  return payload;
}

export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

function requireSecret(): string {
  const secret = env.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret || (typeof secret === "string" && secret.length < 32)) {
    throw new Error("JWT_SECRET não configurado ou muito curto (mínimo 32 caracteres).");
  }
  return secret as string;
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)),
  );
  return base64UrlBytes(sig);
}

function base64Url(str: string): string {
  return base64UrlBytes(new TextEncoder().encode(str));
}

function base64UrlBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}
