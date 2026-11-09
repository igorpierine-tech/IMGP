import { eq, lt } from "drizzle-orm";
import { rateLimitEntries } from "../../db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 120;

const memBuckets = new Map<string, { count: number; resetAt: number }>();
let lastPurge = Date.now();

function purgeExpired(now: number) {
  if (now - lastPurge < DEFAULT_WINDOW_MS) return;
  lastPurge = now;
  for (const [key, entry] of memBuckets) {
    if (entry.resetAt <= now) memBuckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(
  key: string,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  purgeExpired(now);

  let entry = memBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    memBuckets.set(key, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, maxRequests - entry.count);

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining, resetAt: entry.resetAt };
}

export async function checkRateLimitD1(
  db: DrizzleD1Database<typeof schema>,
  key: string,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStart + windowMs * 2;

  const [existing] = await db
    .select()
    .from(rateLimitEntries)
    .where(eq(rateLimitEntries.key, key))
    .limit(1);

  let count: number;

  if (!existing || existing.windowStart !== windowStart) {
    count = 1;
    await db
      .insert(rateLimitEntries)
      .values({ key, count, windowStart, expiresAt })
      .onConflictDoUpdate({
        target: rateLimitEntries.key,
        set: { count: 1, windowStart, expiresAt },
      });
  } else {
    count = existing.count + 1;
    await db
      .update(rateLimitEntries)
      .set({ count })
      .where(eq(rateLimitEntries.key, key));
  }

  const remaining = Math.max(0, maxRequests - count);

  if (count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: windowStart + windowMs };
  }

  return { allowed: true, remaining, resetAt: windowStart + windowMs };
}

export async function purgeExpiredD1(db: DrizzleD1Database<typeof schema>): Promise<number> {
  const now = Date.now();
  const result = await db
    .delete(rateLimitEntries)
    .where(lt(rateLimitEntries.expiresAt, now));
  return (result as unknown as { rowsAffected?: number }).rowsAffected ?? 0;
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(DEFAULT_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function rateLimitKey(request: Request, tenantSlug?: string | null): string {
  const ip = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  return tenantSlug ? `tenant:${tenantSlug}:${ip}` : `global:${ip}`;
}
