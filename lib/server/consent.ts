import { eq, and } from "drizzle-orm";
import { userConsents } from "../../db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

export const CONSENT_TYPES = ["terms_of_use", "privacy_policy", "data_processing"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CURRENT_VERSIONS: Record<ConsentType, string> = {
  terms_of_use: "1.0",
  privacy_policy: "1.0",
  data_processing: "1.0",
};

export async function getUserConsents(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
) {
  return db
    .select()
    .from(userConsents)
    .where(eq(userConsents.userId, userId));
}

export async function hasRequiredConsents(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
): Promise<boolean> {
  const consents = await getUserConsents(db, userId);
  return CONSENT_TYPES.every((type) => {
    const record = consents.find((c) => c.consentType === type);
    return record && record.accepted && !record.revokedAt && record.version === CURRENT_VERSIONS[type];
  });
}

export async function recordConsent(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
  consentType: ConsentType,
  request: Request,
) {
  const now = Date.now();
  const ip = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? null;
  const ua = request.headers.get("user-agent");

  await db
    .insert(userConsents)
    .values({
      userId,
      consentType,
      version: CURRENT_VERSIONS[consentType],
      accepted: true,
      ipAddress: ip,
      userAgent: ua,
      acceptedAt: new Date(now),
    })
    .onConflictDoUpdate({
      target: [userConsents.userId, userConsents.consentType],
      set: {
        version: CURRENT_VERSIONS[consentType],
        accepted: true,
        ipAddress: ip,
        userAgent: ua,
        acceptedAt: new Date(now),
        revokedAt: null,
      },
    });
}

export async function revokeConsent(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
  consentType: ConsentType,
) {
  await db
    .update(userConsents)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(userConsents.userId, userId),
        eq(userConsents.consentType, consentType),
      ),
    );
}
