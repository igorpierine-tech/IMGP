import { asc } from "drizzle-orm";
import {
  demands,
  projectItems,
  projectPhases,
  projects,
  projectTypes,
  sprints,
  users,
} from "../../db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";
import type { CurrentUser } from "./authz";

export async function loadWorkspaceData(
  db: DrizzleD1Database<typeof schema>,
  user: CurrentUser,
) {
  const [phaseRows, userRows, demandRows, projectRows, itemRows, sprintRows, projectTypeRows] =
    await Promise.all([
      db.select().from(projectPhases).orderBy(asc(projectPhases.projectRef), asc(projectPhases.sequence)),
      user.role === "project_coordinator" || user.role === "it_director"
        ? db.select({
            id: users.id,
            email: users.email,
            displayName: users.displayName,
            role: users.role,
            active: users.active,
            mustChangePassword: users.mustChangePassword,
          }).from(users).orderBy(asc(users.displayName))
        : Promise.resolve([]),
      db.select().from(demands).orderBy(asc(demands.createdAt)),
      db.select().from(projects).orderBy(asc(projects.createdAt)),
      db.select().from(projectItems).orderBy(asc(projectItems.projectId), asc(projectItems.id)),
      db.select().from(sprints).orderBy(asc(sprints.projectId), asc(sprints.startDate), asc(sprints.id)),
      db.select().from(projectTypes).orderBy(asc(projectTypes.sequence), asc(projectTypes.name)),
    ]);

  return { phaseRows, userRows, demandRows, projectRows, itemRows, sprintRows, projectTypeRows };
}
