import { eq, sql } from "drizzle-orm";
import { taskDependencies, projectItems } from "../../db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

type TaskNode = {
  id: number;
  name: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  plannedHours: number;
  predecessors: number[];
  successors: number[];
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  slack: number;
  critical: boolean;
};

function parseDateOrZero(d: string | null): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? 0 : t;
}

const DAY_MS = 86_400_000;

export async function computeCriticalPath(
  db: DrizzleD1Database<typeof schema>,
  projectId: number,
): Promise<TaskNode[]> {
  const items = await db
    .select()
    .from(projectItems)
    .where(eq(projectItems.projectId, projectId));

  const deps = await db
    .select()
    .from(taskDependencies)
    .where(
      sql`${taskDependencies.predecessorId} IN (SELECT id FROM project_items WHERE project_id = ${projectId})`,
    );

  const nodes = new Map<number, TaskNode>();

  for (const item of items) {
    nodes.set(item.id, {
      id: item.id,
      name: item.name,
      plannedStart: item.plannedStart,
      plannedEnd: item.plannedEnd,
      plannedHours: item.plannedHours,
      predecessors: [],
      successors: [],
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: Infinity,
      lateFinish: Infinity,
      slack: 0,
      critical: false,
    });
  }

  for (const dep of deps) {
    const pred = nodes.get(dep.predecessorId);
    const succ = nodes.get(dep.successorId);
    if (pred && succ) {
      succ.predecessors.push(dep.predecessorId);
      pred.successors.push(dep.successorId);
    }
  }

  const sorted = topologicalSort(nodes);
  if (!sorted) return Array.from(nodes.values());

  // Forward pass
  for (const id of sorted) {
    const node = nodes.get(id)!;
    const duration = node.plannedHours > 0 ? (node.plannedHours / 8) * DAY_MS : DAY_MS;

    if (node.predecessors.length === 0) {
      node.earlyStart = parseDateOrZero(node.plannedStart);
      node.earlyFinish = node.earlyStart + duration;
    } else {
      node.earlyStart = Math.max(...node.predecessors.map((p) => nodes.get(p)!.earlyFinish));
      node.earlyFinish = node.earlyStart + duration;
    }
  }

  const projectEnd = Math.max(...Array.from(nodes.values()).map((n) => n.earlyFinish));

  // Backward pass
  for (let i = sorted.length - 1; i >= 0; i--) {
    const node = nodes.get(sorted[i])!;
    const duration = node.earlyFinish - node.earlyStart;

    if (node.successors.length === 0) {
      node.lateFinish = projectEnd;
      node.lateStart = node.lateFinish - duration;
    } else {
      node.lateFinish = Math.min(...node.successors.map((s) => nodes.get(s)!.lateStart));
      node.lateStart = node.lateFinish - duration;
    }

    node.slack = node.lateStart - node.earlyStart;
    node.critical = node.slack <= 0;
  }

  return Array.from(nodes.values());
}

function topologicalSort(nodes: Map<number, TaskNode>): number[] | null {
  const inDegree = new Map<number, number>();
  for (const [id, node] of nodes) {
    inDegree.set(id, node.predecessors.length);
  }

  const queue: number[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const result: number[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    const node = nodes.get(id)!;
    for (const succ of node.successors) {
      const newDeg = (inDegree.get(succ) ?? 1) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) queue.push(succ);
    }
  }

  return result.length === nodes.size ? result : null;
}
