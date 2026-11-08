import Script from "next/script";
import { requirePageUser } from "@/lib/server/authz";
import { resolveTenant } from "@/lib/server/tenant-context";
import { APP_BASE_PATH } from "@/lib/app-path";
import { loadWorkspaceData } from "@/lib/server/workspace-data";
import { getTenantDb } from "@/db";
import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantWorkspace({ params }: Props) {
  const { slug } = await params;
  const tenant = await resolveTenant(slug);
  const user = await requirePageUser(`/t/${slug}/legacy`);

  const bindingName = `TENANT_${tenant.id.replace(/-/g, "_").toUpperCase()}`;
  const binding = ((env as Record<string, unknown>)[bindingName] as D1Database | undefined) ?? env.DB;
  if (!binding) throw new Error("Banco de dados do tenant não disponível.");
  const db = getTenantDb(binding);

  const { phaseRows, userRows, demandRows, projectRows, itemRows, sprintRows, projectTypeRows } =
    await loadWorkspaceData(db, user);

  const tenantUser = { ...user, tenantId: tenant.id, tenantSlug: tenant.slug };
  const bootstrap = [
    `window.PROJECTS_BASE_PATH=${safeJson(APP_BASE_PATH)}`,
    `window.tenantSlug=${safeJson(tenant.slug)}`,
    `window.tenantInfo=${safeJson({ id: tenant.id, slug: tenant.slug, name: tenant.name })}`,
    `window.currentUser=${safeJson(tenantUser)}`,
    `window.phaseGroups=${safeJson(phaseRows)}`,
    `window.projectTypes=${safeJson(projectTypeRows)}`,
    `window.platformUsers=${safeJson(userRows)}`,
    `window.platformDemands=${safeJson(demandRows)}`,
    `window.platformProjects=${safeJson(projectRows)}`,
    `window.platformProjectItems=${safeJson(itemRows)}`,
    `window.platformSprints=${safeJson(sprintRows)}`,
    `window.glpiProjectUsers=${safeJson({ users: [], entity: tenant.name })}`,
    `window.glpiViabilityDemands=${safeJson({ tickets: [] })}`,
    `window.glpiPortfolioData=${safeJson({})}`,
  ].join(";") + ";";

  return (
    <>
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/style.css`} />
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/project-workspace.css`} />
      <link rel="stylesheet" href={`${APP_BASE_PATH}/legacy/glpi-portfolio.css`} />
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
      <Script src={`${APP_BASE_PATH}/legacy/glpi-portfolio.js`} strategy="afterInteractive" />
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
