import { getApiContext } from "@/lib/server/api-context";
import { globalSearch } from "@/lib/server/search";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
    const results = await globalSearch(ctx, query, limit);
    return Response.json({ results, query });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
