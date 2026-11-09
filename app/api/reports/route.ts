import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { generateReportHtml } from "@/lib/server/pdf-report";
import { HttpError, errorMessage } from "@/lib/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:export", [
      "project_coordinator", "it_director", "project_analyst",
    ]);

    const url = new URL(request.url);
    const type = url.searchParams.get("type") as "projects" | "demands" | "tasks" | "time_entries";
    const projectId = Number(url.searchParams.get("projectId")) || undefined;
    const format = url.searchParams.get("format") ?? "html";

    if (!type || !["projects", "demands", "tasks", "time_entries"].includes(type)) {
      throw new HttpError(400, "Tipo inválido. Use: projects, demands, tasks, time_entries");
    }

    const html = await generateReportHtml(ctx, type, projectId);

    if (format === "html") {
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="relatorio-${type}.html"`,
        },
      });
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-${type}.html"`,
      },
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
