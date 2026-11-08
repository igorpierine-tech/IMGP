import { masterLogin, masterSessionCookie } from "@/lib/server/master-auth";
import { HttpError } from "@/lib/server/errors";
import { errorMessage } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: "Email e senha são obrigatórios." }, { status: 400 });
    }

    const { token, expiresAt } = await masterLogin(email, password);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": masterSessionCookie(token, expiresAt),
      },
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: errorMessage(error) }, { status });
  }
}
