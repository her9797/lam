import { NextRequest, NextResponse } from "next/server";

import { createQrSessionValue, getQrAccessToken, getQrCookieMaxAge, getQrCookieName } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (token !== getQrAccessToken()) {
    return NextResponse.redirect(new URL("/access-required", request.url));
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(getQrCookieName(), createQrSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getQrCookieMaxAge(),
  });

  return response;
}
