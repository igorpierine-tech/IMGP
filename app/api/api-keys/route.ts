import { eq, and, desc } from "drizzle-orm";
import { apiKeys } from "@/db/schema";
import { getApiContext } from "@/lib/server/api-context";
import { createApiKey, revokeApiKey } from "@/lib/server/api-keys";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);

    const keys = await ctx.db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopesJson: apiKeys.scopesJson,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revoked: apiKeys.revoked,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, ctx.user.id))
      .orderBy(desc(apiKeys.createdAt));

    return Response.json({
      keys: keys.map(k => ({
        ...k,
        scopes: JSON.parse(k.scopesJson),
      })),
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);

    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const scopes = Array.isArray(body.scopes) ? body.scopes.filter((s): s is string => typeof s === "string") : ["read"];
    const expiresInDays = typeof body.expiresInDays === "number" ? body.expiresInDays : undefined;

    const { key, record } = await createApiKey(ctx, name, scopes, expiresInDays);

    await writeAudit({
      actor: ctx.user,
      action: "api_key.created",
      entityType: "api_key",
      entityId: record.id,
      requestId: request.headers.get("cf-ray"),
      after: { name: record.name, keyPrefix: record.keyPrefix, scopes },
    });

    return Response.json({
      key,
      record: {
        id: record.id,
        name: record.name,
        keyPrefix: record.keyPrefix,
        scopes,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
      },
      warning: "Guarde esta chave agora. Ela não será exibida novamente.",
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getApiContext(request);

    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID da chave inválido.");

    await revokeApiKey(ctx, id);

    await writeAudit({
      actor: ctx.user,
      action: "api_key.revoked",
      entityType: "api_key",
      entityId: id,
      requestId: request.headers.get("cf-ray"),
    });

    return Response.json({ revoked: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
