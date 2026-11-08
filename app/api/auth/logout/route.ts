import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destroyPasswordSession, passwordSessionCookieName, passwordSessionCookieOptions } from "@/lib/server/password-auth";
import { APP_BASE_PATH, appUrl } from "@/lib/app-path";

export async function GET(request: Request) {
  const store = await cookies();
  await destroyPasswordSession(store.get(passwordSessionCookieName())?.value);
  const response = NextResponse.redirect(appUrl("/login", request.url), 303);
  response.cookies.set(passwordSessionCookieName(), "", passwordSessionCookieOptions(0));
  response.cookies.set("bj_session", "", { ...passwordSessionCookieOptions(0), path: APP_BASE_PATH });
  return response;
}

export const POST = GET;
