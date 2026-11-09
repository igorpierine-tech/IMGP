import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { HttpError, errorMessage } from "@/lib/server/errors";
import { exportData } from "@/lib/server/export";

const VALID_ENTITIES = ["projects", "demands", "time_entries", "tasks"] as const;
type ExportEntity = (typeof VALID_ENTITIES)[number];

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:read", ["project_coordinator", "it_director", "project_analyst", "area_manager"]);

    const url = new URL(request.url);
    const entity = url.searchParams.get("entity") as ExportEntity;
    const format = (url.searchParams.get("format") ?? "csv") as "csv" | "json";

    if (!entity || !VALID_ENTITIES.includes(entity)) {
      throw new HttpError(400, `Entidade inválida. Opções: ${VALID_ENTITIES.join(", ")}`);
    }
    if (format !== "csv" && format !== "json") {
      throw new HttpError(400, "Formato inválido. Opções: csv, json");
    }

    const result = await exportData(ctx.db, entity, format);

    return new Response(result.content, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
