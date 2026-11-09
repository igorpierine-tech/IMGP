import { eq, and } from "drizzle-orm";
import { userPreferences } from "@/db/schema";
import { getApiContext } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";

const VALID_KEYS = [
  "theme", "language", "timezone", "dateFormat", "itemsPerPage",
  "emailNotifications", "inAppNotifications", "defaultView",
  "sidebarCollapsed", "dashboardLayout",
];

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (key) {
      const [pref] = await ctx.db.select().from(userPreferences)
        .where(and(eq(userPreferences.userId, ctx.user.id), eq(userPreferences.key, key)))
        .limit(1);
      return Response.json({ preference: pref ?? null });
    }

    const all = await ctx.db.select().from(userPreferences)
      .where(eq(userPreferences.userId, ctx.user.id));

    const prefs: Record<string, string> = {};
    for (const p of all) prefs[p.key] = p.value;

    return Response.json({ preferences: prefs, validKeys: VALID_KEYS });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "set");

    if (action === "set") {
      const key = String(body.key ?? "").trim();
      const value = String(body.value ?? "").trim();
      if (!key || !value) throw new HttpError(400, "key e value são obrigatórios.");
      if (!VALID_KEYS.includes(key)) throw new HttpError(400, `Chave inválida. Opções: ${VALID_KEYS.join(", ")}`);

      const existing = await ctx.db.select().from(userPreferences)
        .where(and(eq(userPreferences.userId, ctx.user.id), eq(userPreferences.key, key)))
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await ctx.db.update(userPreferences).set({ value, updatedAt: new Date() })
          .where(and(eq(userPreferences.userId, ctx.user.id), eq(userPreferences.key, key)))
          .returning();
        return Response.json({ preference: updated });
      }

      const [created] = await ctx.db.insert(userPreferences).values({
        userId: ctx.user.id,
        key,
        value,
      }).returning();

      return Response.json({ preference: created }, { status: 201 });
    }

    if (action === "set_bulk") {
      const entries = body.entries as Record<string, string> | undefined;
      if (!entries || typeof entries !== "object") throw new HttpError(400, "entries é obrigatório (objeto chave-valor).");

      const results: Record<string, string> = {};
      for (const [key, value] of Object.entries(entries)) {
        if (!VALID_KEYS.includes(key)) continue;
        const strVal = String(value);

        const existing = await ctx.db.select().from(userPreferences)
          .where(and(eq(userPreferences.userId, ctx.user.id), eq(userPreferences.key, key)))
          .limit(1);

        if (existing.length > 0) {
          await ctx.db.update(userPreferences).set({ value: strVal, updatedAt: new Date() })
            .where(and(eq(userPreferences.userId, ctx.user.id), eq(userPreferences.key, key)));
        } else {
          await ctx.db.insert(userPreferences).values({ userId: ctx.user.id, key, value: strVal });
        }
        results[key] = strVal;
      }
      return Response.json({ updated: results });
    }

    throw new HttpError(400, "Ação inválida.");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const body = await request.json() as Record<string, unknown>;
    const key = String(body.key ?? "").trim();
    if (!key) throw new HttpError(400, "key é obrigatório.");

    await ctx.db.delete(userPreferences)
      .where(and(eq(userPreferences.userId, ctx.user.id), eq(userPreferences.key, key)));

    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
