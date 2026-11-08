import { eq } from "drizzle-orm";
import { tenantRoles, rolePermissions } from "../../db/schema";
import { DEFAULT_ROLES } from "./modules";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../../db/schema";

export async function seedDefaultRoles(
  db: DrizzleD1Database<typeof schema>,
): Promise<void> {
  for (const [key, def] of Object.entries(DEFAULT_ROLES)) {
    const existing = await db
      .select()
      .from(tenantRoles)
      .where(eq(tenantRoles.key, key))
      .limit(1);

    let roleId: number;

    if (existing[0]) {
      roleId = existing[0].id;
    } else {
      const [inserted] = await db
        .insert(tenantRoles)
        .values({
          key,
          name: def.name,
          description: def.description,
          builtIn: true,
          active: true,
        })
        .returning({ id: tenantRoles.id });
      roleId = inserted.id;
    }

    for (const perm of def.permissions) {
      const [moduleKey, action] = perm.split(":") as [string, string];
      await db
        .insert(rolePermissions)
        .values({ roleId, moduleKey, action })
        .onConflictDoNothing();
    }
  }
}
