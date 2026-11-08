import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_BASE_PATH, appPath } from "@/lib/app-path";

const SESSION_COOKIE = "bj_session";
const FLOW_COOKIE = "bj_oidc_flow";
const SESSION_SECONDS = 8 * 60 * 60;
const FLOW_SECONDS = 10 * 60;

export type EntraUser = {
  userId: string;
  tenantId: string;
  objectId: string;
  email: string;
  displayName: string;
  expiresAt: number;
};

export type EntraFlow = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  expiresAt: number;
};

type IdTokenClaims = {
  aud?: string;
  exp?: number;
  nbf?: number;
  iss?: string;
  nonce?: string;
  oid?: string;
  sub?: string;
  tid?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
};

export function entraConfiguration() {
  const tenantId = process.env.ENTRA_TENANT_ID?.trim() ?? "";
  const clientId = process.env.ENTRA_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.ENTRA_CLIENT_SECRET?.trim() ?? "";
  const sessionSecret = process.env.AUTH_SESSION_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.ENTRA_REDIRECT_URI?.trim() ??
    "https://raizeseriquezas-projetos-production.up.railway.app/Projetos/auth/callback";
  return {
    tenantId,
    clientId,
    clientSecret,
    sessionSecret,
    redirectUri,
    configured: Boolean(
      isGuid(tenantId) && isGuid(clientId) && clientSecret && sessionSecret.length >= 32,
    ),
  };
}

export async function getEntraUser(): Promise<EntraUser | null> {
  const config = entraConfiguration();
  if (!config.configured) return null;
  const store = await cookies();
  const encoded = store.get(SESSION_COOKIE)?.value;
  if (!encoded) return null;
  const user = await decryptCookie<EntraUser>(encoded, config.sessionSecret);
  if (!user || user.expiresAt <= Date.now()) return null;
  return user;
}

export async function requireEntraUser(returnTo: string): Promise<EntraUser> {
  const user = await getEntraUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

export async function createAuthorizationRequest(returnTo: string) {
  const config = requireConfiguration();
  const state = randomToken(24);
  const nonce = randomToken(24);
  const verifier = randomToken(48);
  const challenge = base64Url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  const flow: EntraFlow = {
    state,
    nonce,
    verifier,
    returnTo: safeReturnPath(returnTo),
    expiresAt: Date.now() + FLOW_SECONDS * 1000,
  };
  const authority = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/authorize`;
  const url = new URL(authority);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return {
    url,
    cookie: await encryptCookie(flow, config.sessionSecret),
  };
}

export async function completeAuthorization(
  code: string,
  state: string,
  encodedFlow: string | undefined,
) {
  const config = requireConfiguration();
  if (!encodedFlow) throw new Error("Fluxo de autenticação não encontrado.");
  const flow = await decryptCookie<EntraFlow>(encodedFlow, config.sessionSecret);
  if (!flow || flow.expiresAt <= Date.now() || !timingSafeEqual(flow.state, state)) {
    throw new Error("Fluxo de autenticação expirado ou inválido.");
  }

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    code_verifier: flow.verifier,
    scope: "openid profile email",
  });
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokens = (await tokenResponse.json()) as { id_token?: string; error_description?: string };
  if (!tokenResponse.ok || !tokens.id_token) {
    throw new Error(tokens.error_description || "O Microsoft Entra ID não retornou um token de identidade.");
  }

  const claims = await verifyIdToken(tokens.id_token, config, flow.nonce);
  const tenantId = String(claims.tid || "");
  const objectId = String(claims.oid || claims.sub || "");
  const email = String(claims.preferred_username || claims.email || "").toLowerCase();
  if (!tenantId || tenantId.toLowerCase() !== config.tenantId.toLowerCase()) {
    throw new Error("A conta autenticada não pertence ao tenant autorizado.");
  }
  if (!objectId || !email) throw new Error("A conta corporativa não informou identificador e e-mail.");

  const user: EntraUser = {
    userId: `entra:${tenantId}:${objectId}`,
    tenantId,
    objectId,
    email,
    displayName: String(claims.name || email),
    expiresAt: Math.min(Number(claims.exp || 0) * 1000, Date.now() + SESSION_SECONDS * 1000),
  };
  return {
    user,
    returnTo: flow.returnTo,
    cookie: await encryptCookie(user, config.sessionSecret),
  };
}

export function sessionCookieOptions(maxAge = SESSION_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function flowCookieOptions(maxAge = FLOW_SECONDS) {
  return { ...sessionCookieOptions(maxAge), path: appPath("/auth") };
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function flowCookieName() {
  return FLOW_COOKIE;
}

export function logoutUrl() {
  const config = entraConfiguration();
  if (!config.tenantId) return appPath("/login");
  const url = new URL(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/logout`,
  );
  url.searchParams.set("post_logout_redirect_uri", new URL(appPath("/login"), config.redirectUri).toString());
  return url.toString();
}

function requireConfiguration() {
  const config = entraConfiguration();
  if (!config.configured) throw new Error("Integração com o Microsoft Entra ID ainda não configurada.");
  return config;
}

async function verifyIdToken(
  token: string,
  config: ReturnType<typeof requireConfiguration>,
  expectedNonce: string,
) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Token de identidade inválido.");
  const header = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0]))) as { alg?: string; kid?: string };
  const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1]))) as IdTokenClaims;
  if (header.alg !== "RS256" || !header.kid) throw new Error("Algoritmo de assinatura não autorizado.");

  const keysResponse = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/discovery/v2.0/keys`,
  );
  if (!keysResponse.ok) throw new Error("Não foi possível consultar as chaves do Microsoft Entra ID.");
  const keySet = (await keysResponse.json()) as { keys?: Array<JsonWebKey & { kid?: string }> };
  const jwk = keySet.keys?.find((item) => item.kid === header.kid);
  if (!jwk) throw new Error("Chave de assinatura do token não encontrada.");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    fromBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new Error("Assinatura do token inválida.");

  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://login.microsoftonline.com/${config.tenantId}/v2.0`;
  if (claims.iss?.toLowerCase() !== expectedIssuer.toLowerCase()) throw new Error("Emissor do token inválido.");
  if (claims.aud !== config.clientId) throw new Error("Token emitido para outra aplicação.");
  if (!claims.exp || claims.exp <= now || (claims.nbf && claims.nbf > now + 60)) throw new Error("Token expirado ou ainda não válido.");
  if (!claims.nonce || !timingSafeEqual(claims.nonce, expectedNonce)) throw new Error("Nonce de autenticação inválido.");
  return claims;
}

async function encryptCookie(value: unknown, secret: string) {
  const key = await cookieKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  return `${base64Url(iv)}.${base64Url(cipher)}`;
}

async function decryptCookie<T>(encoded: string, secret: string): Promise<T | null> {
  try {
    const [ivPart, cipherPart] = encoded.split(".");
    if (!ivPart || !cipherPart) return null;
    const key = await cookieKey(secret);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(ivPart) },
      key,
      fromBase64Url(cipherPart),
    );
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}

async function cookieKey(secret: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function randomToken(bytes: number) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function isGuid(value: string) {
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const normalized = value === APP_BASE_PATH
      ? "/"
      : value.startsWith(`${APP_BASE_PATH}/`)
        ? value.slice(APP_BASE_PATH.length)
        : value;
    const url = new URL(normalized, "https://app.local");
    if (url.origin !== "https://app.local" || url.pathname.startsWith("/auth")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
