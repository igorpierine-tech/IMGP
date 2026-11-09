import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { getApiContext } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { generateSecret, buildOtpAuthUri, enableTOTP, disableTOTP, verifyTOTP } from "@/lib/server/totp";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const [user] = await ctx.db.select({ totpEnabled: users.totpEnabled }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user) throw new HttpError(404, "Usuário não encontrado.");

    if (user.totpEnabled) {
      return Response.json({ enabled: true });
    }

    const secret = generateSecret();
    const uri = buildOtpAuthUri(secret, ctx.user.email);
    return Response.json({ enabled: false, secret, uri });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const body = await request.json() as Record<string, unknown>;
    const action = body.action as string;

    if (action === "enable") {
      const secret = typeof body.secret === "string" ? body.secret : "";
      const token = typeof body.token === "string" ? body.token : "";
      if (!secret || !token) throw new HttpError(400, "Secret e token são obrigatórios.");
      const ok = await enableTOTP(ctx.db, ctx.user.id, secret, token);
      if (!ok) throw new HttpError(400, "Token inválido. Verifique o código do seu app autenticador.");
      return Response.json({ message: "2FA habilitado com sucesso." });
    }

    if (action === "disable") {
      const token = typeof body.token === "string" ? body.token : "";
      if (!token) throw new HttpError(400, "Token é obrigatório para desabilitar 2FA.");
      const [user] = await ctx.db.select({ totpSecret: users.totpSecret }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!user?.totpSecret) throw new HttpError(400, "2FA não está habilitado.");
      const valid = await verifyTOTP(user.totpSecret, token);
      if (!valid) throw new HttpError(400, "Token inválido.");
      await disableTOTP(ctx.db, ctx.user.id);
      return Response.json({ message: "2FA desabilitado." });
    }

    if (action === "verify") {
      const token = typeof body.token === "string" ? body.token : "";
      if (!token) throw new HttpError(400, "Token é obrigatório.");
      const [user] = await ctx.db.select({ totpSecret: users.totpSecret }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!user?.totpSecret) throw new HttpError(400, "2FA não está habilitado.");
      const valid = await verifyTOTP(user.totpSecret, token);
      return Response.json({ valid });
    }

    throw new HttpError(400, "Ação inválida. Opções: enable, disable, verify");
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
