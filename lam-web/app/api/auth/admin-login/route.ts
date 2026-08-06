import { NextRequest, NextResponse } from "next/server";

import {
  createAdminSessionValue,
  getAdminCookieMaxAge,
  getAdminCookieName,
  getAdminPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = payload?.password?.trim() ?? "";

  if (!password || password !== getAdminPassword()) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAdminCookieName(), createAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAdminCookieMaxAge(),
  });

  return response;
}
