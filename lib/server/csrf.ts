import { env } from "cloudflare:workers";

const WINDOW_SECONDS = 3600;

function requireSecret(): string {
  const secret = env.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret || (typeof secret === "string" && secret.length < 32)) {
    throw new Error("JWT_SECRET não configurado.");
  }
  return secret as string;
}

function currentSlot(): number {
  return Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
}

async function hmacToken(slot: number): Promise<string> {
  const secret = requireSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = `csrf:${slot}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)),
  );
  let binary = "";
  for (const b of sig) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function getCsrfToken(): Promise<string> {
  return hmacToken(currentSlot());
}

export async function verifyCsrfToken(
  _request: Request,
  formToken: string | null,
): Promise<string | null> {
  if (!formToken) {
    return "Token de segurança ausente. Recarregue a página e tente novamente.";
  }

  const slot = currentSlot();
  const currentToken = await hmacToken(slot);
  const previousToken = await hmacToken(slot - 1);

  if (timingSafeEqual(formToken, currentToken) || timingSafeEqual(formToken, previousToken)) {
    return null;
  }

  return "Token de segurança expirado. Recarregue a página e tente novamente.";
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}
