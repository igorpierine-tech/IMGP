import { NextRequest, NextResponse } from "next/server";
import {
  completeAuthorization,
  flowCookieName,
  flowCookieOptions,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/server/entra-auth";
import { appUrl } from "@/lib/app-path";

export async function GET(request: NextRequest) {
  const providerError = request.nextUrl.searchParams.get("error_description") || request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  try {
    if (providerError) throw new Error(providerError);
    if (!code || !state) throw new Error("Resposta de autenticação incompleta.");
    const completed = await completeAuthorization(code, state, request.cookies.get(flowCookieName())?.value);
    const response = NextResponse.redirect(appUrl(completed.returnTo, request.url));
    response.cookies.set(sessionCookieName(), completed.cookie, sessionCookieOptions());
    response.cookies.set(flowCookieName(), "", flowCookieOptions(0));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível concluir a autenticação.";
    const response = NextResponse.redirect(appUrl(`/login?error=${encodeURIComponent(message)}`, request.url));
    response.cookies.set(flowCookieName(), "", flowCookieOptions(0));
    return response;
  }
}
