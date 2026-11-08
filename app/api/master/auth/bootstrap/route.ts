import { env } from "cloudflare:workers";
import { count } from "drizzle-orm";
import { getMasterDb } from "@/db";
import { masterUsers } from "@/db/master-schema";
import { hashPassword } from "@/lib/server/master-auth";
import { errorMessage } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    const { token, email, password, displayName } = await request.json();

    if (!env.MASTER_BOOTSTRAP_TOKEN || token !== env.MASTER_BOOTSTRAP_TOKEN) {
      return Response.json({ error: "Token de bootstrap inválido." }, { status: 403 });
    }

    if (!email || !password) {
      return Response.json({ error: "Email e senha são obrigatórios." }, { status: 400 });
    }

    if (password.length < 10 || password.length > 128) {
      return Response.json({ error: "Senha deve ter entre 10 e 128 caracteres." }, { status: 400 });
    }

    const db = getMasterDb();
    const [{ value }] = await db.select({ value: count() }).from(masterUsers);

    if (value > 0) {
      return Response.json(
        { error: "Bootstrap já executado. Use o painel master para criar usuários." },
        { status: 409 },
      );
    }

    const { hash, salt, iterations } = await hashPassword(password);
    const id = `master:${crypto.randomUUID()}`;

    await db.insert(masterUsers).values({
      id,
      email: email.toLowerCase().trim(),
      displayName: displayName || "Super Admin",
      role: "super_admin",
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: iterations,
    });

    return Response.json({ ok: true, userId: id });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
