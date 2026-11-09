import { getApiContext } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { getUserConsents, recordConsent, revokeConsent, CONSENT_TYPES, type ConsentType } from "@/lib/server/consent";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const consents = await getUserConsents(ctx.db, ctx.user.id);
    return Response.json({ consents });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const body = await request.json() as Record<string, unknown>;
    const consentType = body.consentType as string;
    if (!CONSENT_TYPES.includes(consentType as ConsentType)) {
      throw new HttpError(400, "Tipo de consentimento inválido.");
    }
    if (body.revoke === true) {
      await revokeConsent(ctx.db, ctx.user.id, consentType as ConsentType);
      return Response.json({ message: "Consentimento revogado." });
    }
    await recordConsent(ctx.db, ctx.user.id, consentType as ConsentType, request);
    return Response.json({ message: "Consentimento registrado." }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
