import { projects, projectItems, demands } from "@/db/schema";
import { getApiContext, checkPermissionOrRole } from "@/lib/server/api-context";
import { writeAudit } from "@/lib/server/audit";
import { HttpError, errorMessage } from "@/lib/server/errors";

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

export async function POST(request: Request) {
  try {
    const ctx = await getApiContext(request);
    checkPermissionOrRole(ctx, "projects:create", ["project_coordinator", "it_director", "project_analyst"]);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityType = String(formData.get("entityType") ?? "");

    if (!file) throw new HttpError(400, "Arquivo CSV é obrigatório.");
    if (!["projects", "tasks", "demands"].includes(entityType)) {
      throw new HttpError(400, "entityType deve ser: projects, tasks ou demands.");
    }
    if (file.size > 5 * 1024 * 1024) throw new HttpError(400, "Arquivo máximo: 5MB.");

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) throw new HttpError(400, "Nenhum registro encontrado no CSV.");
    if (rows.length > 500) throw new HttpError(400, "Máximo de 500 registros por importação.");

    let imported = 0;
    const errors: { row: number; error: string }[] = [];

    if (entityType === "projects") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row.name ?? row.nome ?? "";
        if (!name) { errors.push({ row: i + 2, error: "Nome obrigatório" }); continue; }
        try {
          await ctx.db.insert(projects).values({
            name,
            area: row.area ?? row.área ?? null,
            status: row.status ?? "planning",
            plannedStart: row.planned_start ?? row.inicio ?? null,
            plannedEnd: row.planned_end ?? row.fim ?? null,
          });
          imported++;
        } catch (e) {
          errors.push({ row: i + 2, error: e instanceof Error ? e.message : "Erro" });
        }
      }
    }

    if (entityType === "tasks") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row.name ?? row.nome ?? "";
        const projectId = Number(row.project_id ?? row.projeto_id);
        if (!name || !projectId) { errors.push({ row: i + 2, error: "Nome e project_id obrigatórios" }); continue; }
        try {
          await ctx.db.insert(projectItems).values({
            projectId,
            name,
            kind: (row.kind ?? row.tipo ?? "task") as "task" | "milestone" | "subtask",
            status: row.status ?? "planned",
            assignedName: row.assigned_name ?? row.responsavel ?? null,
            plannedStart: row.planned_start ?? row.inicio ?? null,
            plannedEnd: row.planned_end ?? row.fim ?? null,
          });
          imported++;
        } catch (e) {
          errors.push({ row: i + 2, error: e instanceof Error ? e.message : "Erro" });
        }
      }
    }

    if (entityType === "demands") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row.name ?? row.nome ?? "";
        const area = row.area ?? row.área ?? "";
        const objective = row.objective ?? row.objetivo ?? "";
        if (!name || !area || !objective) { errors.push({ row: i + 2, error: "Nome, área e objetivo obrigatórios" }); continue; }
        try {
          await ctx.db.insert(demands).values({
            name,
            area,
            objective,
            stage: row.stage ?? row.etapa ?? "Triagem",
            impact: row.impact ?? row.impacto ?? "Médio",
            estimatedHours: Number(row.estimated_hours ?? row.horas) || 0,
            estimatedCost: Number(row.estimated_cost ?? row.custo) || 0,
          });
          imported++;
        } catch (e) {
          errors.push({ row: i + 2, error: e instanceof Error ? e.message : "Erro" });
        }
      }
    }

    await writeAudit({
      actor: ctx.user,
      action: "data.imported",
      entityType,
      requestId: request.headers.get("cf-ray"),
      metadata: { imported, errors: errors.length, fileName: file.name },
    });

    return Response.json({ imported, errors, total: rows.length });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
