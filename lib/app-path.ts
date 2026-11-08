export const APP_BASE_PATH = "/Projetos";
export const APP_ORIGIN = "https://raizeseriquezas-projetos-production.up.railway.app";
export const APP_URL = `${APP_ORIGIN}${APP_BASE_PATH}`;

export function appPath(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === APP_BASE_PATH || normalized.startsWith(`${APP_BASE_PATH}/`)) return normalized;
  return normalized === "/" ? APP_BASE_PATH : `${APP_BASE_PATH}${normalized}`;
}

export function appUrl(path = "/", base = APP_ORIGIN) {
  const url = new URL(appPath(path), base);
  if (url.protocol === "http:" && url.hostname.endsWith(".up.railway.app")) url.protocol = "https:";
  return url;
}
