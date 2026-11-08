export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado";
  if (message.includes("no such table")) {
    return "A estrutura do banco ainda não foi aplicada. Publique a versão com as migrações D1.";
  }
  return message;
}

export function jsonError(error: unknown, status = 500) {
  return Response.json({ error: errorMessage(error) }, { status });
}
