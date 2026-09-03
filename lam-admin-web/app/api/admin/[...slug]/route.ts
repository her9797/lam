import { NextRequest, NextResponse } from "next/server";

import { getAdminCookieName, isAdminSessionValid } from "@/lib/auth/session";

function getApiBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error("API_BASE_URL 환경변수가 설정되어 있지 않습니다.");
  }
  return baseUrl;
}

function getAdminApiToken(): string {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) {
    throw new Error("ADMIN_API_TOKEN 환경변수가 설정되어 있지 않습니다.");
  }
  return token;
}

const BODYLESS_METHODS = new Set(["GET", "HEAD", "DELETE"]);

type RouteContext = { params: Promise<{ slug: string[] }> };

async function forward(request: NextRequest, slug: string[]) {
  const session = request.cookies.get(getAdminCookieName())?.value;
  if (!isAdminSessionValid(session)) {
    return NextResponse.json(
      { error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  }

  const targetPath = slug.join("/");
  const bodyBuffer = BODYLESS_METHODS.has(request.method)
    ? undefined
    : await request.arrayBuffer();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getAdminApiToken()}`,
  };
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const upstreamResponse = await fetch(
    `${getApiBaseUrl()}/api/v1/admin/${targetPath}`,
    {
      method: request.method,
      headers,
      body: bodyBuffer,
      cache: "no-store",
    },
  );

  const responseBody = await upstreamResponse.arrayBuffer();
  const nextResponse = new NextResponse(responseBody, {
    status: upstreamResponse.status,
  });
  const responseContentType = upstreamResponse.headers.get("content-type");
  if (responseContentType) {
    nextResponse.headers.set("Content-Type", responseContentType);
  }
  return nextResponse;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  return forward(request, slug);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  return forward(request, slug);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  return forward(request, slug);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  return forward(request, slug);
}
