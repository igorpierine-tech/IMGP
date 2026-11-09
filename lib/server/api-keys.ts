import { eq, and } from "drizzle-orm";
import { apiKeys } from "../../db/schema";
import type { ApiContext } from "./api-context";
import { HttpError } from "./errors";

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return "imgp_" + Array.from(bytes).map(b => chars[b % chars.length]).join("");
}

export async function createApiKey(
  ctx: ApiContext,
  name: string,
  scopes: string[],
  expiresInDays?: number,
): Promise<{ key: string; record: typeof apiKeys.$inferSelect }> {
  if (!name || name.length < 2) throw new HttpError(400, "Nome da chave é obrigatório.");
  if (scopes.length === 0) throw new HttpError(400, "Selecione ao menos um escopo.");

  const validScopes = scopes.filter(s => ["read", "write", "admin"].includes(s));
  if (validScopes.length === 0) throw new HttpError(400, "Escopos inválidos. Use: read, write, admin.");

  const rawKey = generateKey();
  const keyHash = await sha256Hex(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86_400_000)
    : null;

  const [record] = await ctx.db.insert(apiKeys).values({
    userId: ctx.user.id,
    name,
    keyHash,
    keyPrefix,
    scopesJson: JSON.stringify(validScopes),
    expiresAt,
  }).returning();

  return { key: rawKey, record };
}

export async function validateApiKey(
  db: ApiContext["db"],
  rawKey: string,
): Promise<typeof apiKeys.$inferSelect | null> {
  const keyHash = await sha256Hex(rawKey);
  const [record] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.revoked, false)))
    .limit(1);

  if (!record) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, record.id));

  return record;
}

export async function revokeApiKey(ctx: ApiContext, keyId: number): Promise<void> {
  const [record] = await ctx.db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, ctx.user.id)))
    .limit(1);

  if (!record) throw new HttpError(404, "Chave não encontrada.");
  if (record.revoked) throw new HttpError(400, "Chave já foi revogada.");

  await ctx.db
    .update(apiKeys)
    .set({ revoked: true })
    .where(eq(apiKeys.id, keyId));
}
