import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";
import { desc } from "drizzle-orm";
import { projects, demands, timeEntries, projectItems } from "../../db/schema";

type ExportEntity = "projects" | "demands" | "time_entries" | "tasks";

function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  return lines.join("\r\n");
}

export async function exportData(
  db: DrizzleD1Database<typeof schema>,
  entity: ExportEntity,
  format: "csv" | "json",
): Promise<{ content: string; contentType: string; filename: string }> {
  let rows: Record<string, unknown>[];
  let headers: string[];

  switch (entity) {
    case "projects": {
      const data = await db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(5000);
      rows = data as unknown as Record<string, unknown>[];
      headers = ["id", "name", "code", "area", "status", "health", "progress", "plannedStart", "plannedEnd", "actualStart", "actualEnd", "plannedHours", "plannedCost", "actualCost"];
      break;
    }
    case "demands": {
      const data = await db.select().from(demands).orderBy(desc(demands.updatedAt)).limit(5000);
      rows = data as unknown as Record<string, unknown>[];
      headers = ["id", "name", "area", "stage", "objective", "impact", "estimatedCost", "estimatedHours"];
      break;
    }
    case "time_entries": {
      const data = await db.select().from(timeEntries).orderBy(desc(timeEntries.createdAt)).limit(10000);
      rows = data as unknown as Record<string, unknown>[];
      headers = ["id", "projectId", "itemId", "userId", "activity", "status", "startedAt", "endedAt", "totalMinutes"];
      break;
    }
    case "tasks": {
      const data = await db.select().from(projectItems).orderBy(desc(projectItems.updatedAt)).limit(10000);
      rows = data as unknown as Record<string, unknown>[];
      headers = ["id", "projectId", "kind", "name", "status", "health", "assignedName", "plannedStart", "plannedEnd", "plannedHours"];
      break;
    }
    default:
      throw new Error(`Entidade de exportação inválida: ${entity}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  if (format === "json") {
    return {
      content: JSON.stringify(rows, null, 2),
      contentType: "application/json",
      filename: `${entity}_${timestamp}.json`,
    };
  }

  return {
    content: toCsv(headers, rows),
    contentType: "text/csv; charset=utf-8",
    filename: `${entity}_${timestamp}.csv`,
  };
}
