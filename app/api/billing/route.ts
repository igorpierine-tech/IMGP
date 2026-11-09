import { getApiContext, checkRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { createCheckoutSession, createPortalSession, listPlans } from "@/lib/server/billing";

export async function GET(request: Request) {
  try {
    await getApiContext(request);
    const plans = await listPlans();
    return Response.json({ plans });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkRole(ctx, ["project_coordinator", "it_director"]);

    if (!ctx.tenantCtx) throw new HttpError(400, "Workspace não identificado.");
    const tenantId = ctx.tenantCtx.tenant.id;

    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const baseUrl = new URL(request.url).origin;

    if (action === "checkout") {
      const priceId = typeof body.priceId === "string" ? body.priceId : "";
      if (!priceId) throw new HttpError(400, "priceId é obrigatório.");
      const result = await createCheckoutSession(
        tenantId,
        priceId,
        `${baseUrl}/billing?success=1`,
        `${baseUrl}/billing?cancelled=1`,
      );
      return Response.json(result);
    }

    if (action === "portal") {
      const result = await createPortalSession(tenantId, `${baseUrl}/billing`);
      return Response.json(result);
    }

    throw new HttpError(400, "Ação inválida. Opções: checkout, portal");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
