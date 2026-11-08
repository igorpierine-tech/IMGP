import { NextRequest, NextResponse } from "next/server";
import { createAuthorizationRequest, flowCookieName, flowCookieOptions, safeReturnPath } from "@/lib/server/entra-auth";
import { appUrl } from "@/lib/app-path";

export async function GET(request: NextRequest) {
  try {
    const returnTo = safeReturnPath(request.nextUrl.searchParams.get("return_to"));
    const authorization = await createAuthorizationRequest(returnTo);
    const response = NextResponse.redirect(authorization.url);
    response.cookies.set(flowCookieName(), authorization.cookie, flowCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível iniciar a autenticação.";
    return NextResponse.redirect(appUrl(`/login?error=${encodeURIComponent(message)}`, request.url));
  }
}
