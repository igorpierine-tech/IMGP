import { getApiContext } from "@/lib/server/api-context";
import { errorMessage, HttpError } from "@/lib/server/errors";
import { chat } from "@/lib/server/ai-assistant";

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const body = await request.json() as { messages?: { role: string; content: string }[] };
    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpError(400, "Mensagens são obrigatórias.");
    }
    const sanitized = messages.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: typeof m.content === "string" ? m.content : "",
    })).filter((m) => m.content.length > 0);

    if (sanitized.length === 0) throw new HttpError(400, "Nenhuma mensagem válida.");

    const reply = await chat(sanitized, ctx);
    return Response.json({ reply });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: errorMessage(error) }, { status });
  }
}
