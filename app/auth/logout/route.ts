import { NextResponse } from "next/server";
import { logoutUrl, sessionCookieName, sessionCookieOptions } from "@/lib/server/entra-auth";

export async function GET() {
  const response = NextResponse.redirect(logoutUrl());
  response.cookies.set(sessionCookieName(), "", sessionCookieOptions(0));
  return response;
}
