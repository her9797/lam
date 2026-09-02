import { NextRequest, NextResponse } from "next/server";

import { createQrSessionValue, getQrAccessToken, getQrCookieMaxAge, getQrCookieName } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : request.nextUrl.origin;

  if (token !== getQrAccessToken()) {
    return NextResponse.redirect(new URL("/access-required", origin));
  }

  const response = NextResponse.redirect(new URL("/", origin));
  response.cookies.set(getQrCookieName(), createQrSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getQrCookieMaxAge(),
  });

  return response;
}
