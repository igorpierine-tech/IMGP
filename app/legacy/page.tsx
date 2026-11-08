import Script from "next/script";
import portfolio from "@/data/glpi-portfolio.json";
import projectUsers from "@/data/glpi-project-users.json";
import viabilityDemands from "@/data/glpi-viability-demands.json";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { demands, projectItems, projectPhases, projects, projectTypes, sprints, users } from "@/db/schema";
import { requirePageUser } from "@/lib/server/authz";
import { APP_BASE_PATH } from "@/lib/app-path";

export const dynamic = "force-dynamic";

export default async function LegacyWorkspace() {
  const user = await requirePageUser("/legacy");
  const [phaseRows, userRows, demandRows, projectRows, itemRows, sprintRows, projectTypeRows] = await Promise.all([
    getDb().select().from(projectPhases).orderBy(asc(projectPhases.projectRef), asc(projectPhases.sequence)),
    user.role === "project_coordinator" || user.role === "it_director"
      ? getDb().select({ id: users.id, email: users.email, displayName: users.displayName, role: users.role, active: users.active, mustChangePassword: users.mustChangePassword }).from(users).orderBy(asc(users.displayName))
      : Promise.resolve([]),
    getDb().select().from(demands).orderBy(asc(demands.createdAt)),
    getDb().select().from(projects).orderBy(asc(projects.createdAt)),
    getDb().select().from(projectItems).orderBy(asc(projectItems.projectId), asc(projectItems.id)),
    getDb().select().from(sprints).orderBy(asc(sprints.projectId), asc(sprints.startDate), asc(sprints.id)),
    getDb().select().from(projectTypes).orderBy(asc(projectTypes.sequence), asc(projectTypes.name)),
  ]);
  const bootstrap = `window.PROJECTS_BASE_PATH=${safeJson(APP_BASE_PATH)};window.currentUser=${safeJson(user)};window.phaseGroups=${safeJson(phaseRows)};window.projectTypes=${safeJson(projectTypeRows)};window.platformUsers=${safeJson(userRows)};window.platformDemands=${safeJson(demandRows)};window.platformProjects=${safeJson(projectRows)};window.platformProjectItems=${safeJson(itemRows)};window.platformSprints=${safeJson(sprintRows)};window.glpiProjectUsers=${safeJson(projectUsers)};window.glpiViabilityDemands=${safeJson(viabilityDemands)};window.glpiPortfolioData=${safeJson(portfolio)};`;
  return (
    <>
      <link rel="stylesheet" href="/legacy/style.css" />
      <link rel="stylesheet" href="/legacy/project-workspace.css" />
      <link rel="stylesheet" href="/legacy/glpi-portfolio.css" />
      <link rel="stylesheet" href="/legacy/time-tracking.css" />
      <link rel="stylesheet" href="/legacy/status-visuals.css" />
      <link rel="stylesheet" href="/legacy/dashboards.css" />
      <link rel="stylesheet" href="/legacy/multi-select.css" />
      <link rel="stylesheet" href="/legacy/responsive.css" />
      <div id="app" />
      <Script id="authenticated-workspace-data" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: bootstrap }} />
      <Script src="/legacy/app.js" strategy="afterInteractive" />
      <Script src="/legacy/multi-select.js" strategy="afterInteractive" />
      <Script src="/legacy/project-workspace.js" strategy="afterInteractive" />
      <Script src="/legacy/glpi-portfolio.js" strategy="afterInteractive" />
      <Script src="/legacy/time-tracking.js" strategy="afterInteractive" />
      <Script src="/legacy/status-visuals.js" strategy="afterInteractive" />
      <Script src="/legacy/dashboards.js" strategy="afterInteractive" />
      <Script src="/legacy/roi.js" strategy="afterInteractive" />
      <Script src="/legacy/foundation-client.js" strategy="afterInteractive" />
    </>
  );
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
