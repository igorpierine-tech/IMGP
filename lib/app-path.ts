export const APP_BASE_PATH = "/Projetos";

const FALLBACK_ORIGIN = "https://raizeseriquezas-projetos-production.up.railway.app";

export function getAppOrigin(request?: Request): string {
  if (request) {
    const forwarded = request.headers.get("x-forwarded-host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (forwarded) return `${proto}://${forwarded}`;

    const host = request.headers.get("host");
    if (host) {
      const scheme = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
      return `${scheme}://${host}`;
    }
  }
  return FALLBACK_ORIGIN;
}

export const APP_ORIGIN = FALLBACK_ORIGIN;
export const APP_URL = `${APP_ORIGIN}${APP_BASE_PATH}`;

export function appPath(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === APP_BASE_PATH || normalized.startsWith(`${APP_BASE_PATH}/`)) return normalized;
  return normalized === "/" ? APP_BASE_PATH : `${APP_BASE_PATH}${normalized}`;
}

export function appUrl(path = "/", base?: string, request?: Request) {
  const origin = base ?? getAppOrigin(request);
  const url = new URL(appPath(path), origin);
  if (url.protocol === "http:" && url.hostname.endsWith(".up.railway.app")) url.protocol = "https:";
  return url;
}
