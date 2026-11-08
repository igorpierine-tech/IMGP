import Script from "next/script";
import portfolio from "@/data/external-portfolio.json";
import projectUsers from "@/data/external-project-users.json";
import viabilityDemands from "@/data/external-viability-demands.json";
import { getDb } from "@/db";
import { requirePageUser } from "@/lib/server/authz";
import { APP_BASE_PATH } from "@/lib/app-path";
import { loadWorkspaceData } from "@/lib/server/workspace-data";

export const dynamic = "force-dynamic";

export default async function LegacyWorkspace() {
  const user = await requirePageUser("/legacy");
  const { phaseRows, userRows, demandRows, projectRows, itemRows, sprintRows, projectTypeRows } =
    await loadWorkspaceData(getDb(), user);
  const bootstrap = `window.PROJECTS_BASE_PATH=${safeJson(APP_BASE_PATH)};window.currentUser=${safeJson(user)};window.phaseGroups=${safeJson(phaseRows)};window.projectTypes=${safeJson(projectTypeRows)};window.platformUsers=${safeJson(userRows)};window.platformDemands=${safeJson(demandRows)};window.platformProjects=${safeJson(projectRows)};window.platformProjectItems=${safeJson(itemRows)};window.platformSprints=${safeJson(sprintRows)};window.externalProjectUsers=${safeJson(projectUsers)};window.externalViabilityDemands=${safeJson(viabilityDemands)};window.externalPortfolioData=${safeJson(portfolio)};`;
  return (
    <>
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/style.css`} />
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/project-workspace.css`} />
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/portfolio.css`} />
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/time-tracking.css`} />
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/status-visuals.css`} />
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/dashboards.css`} />
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/multi-select.css`} />
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/responsive.css`} />
      <div id="app" />
      <Script id="authenticated-workspace-data" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: bootstrap }} />
      <Script src={`${APP_BASE_PATH}/legacy/app.js`} strategy="afterInteractive" />
      <Script src={`${APP_BASE_PATH}/legacy/multi-select.js`} strategy="afterInteractive" />
      <Script src={`${APP_BASE_PATH}/legacy/project-workspace.js`} strategy="afterInteractive" />
      <Script src={`${APP_BASE_PATH}/legacy/portfolio.js`} strategy="afterInteractive" />
      <Script src={`${APP_BASE_PATH}/legacy/time-tracking.js`} strategy="afterInteractive" />
      <Script src={`${APP_BASE_PATH}/legacy/status-visuals.js`} strategy="afterInteractive" />
      <Script src={`${APP_BASE_PATH}/legacy/dashboards.js`} strategy="afterInteractive" />
      <Script src={`${APP_BASE_PATH}/legacy/roi.js`} strategy="afterInteractive" />
      <Script src={`${APP_BASE_PATH}/legacy/foundation-client.js`} strategy="afterInteractive" />
    </>
  );
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
