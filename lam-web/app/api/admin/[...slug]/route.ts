import { NextRequest, NextResponse } from "next/server";

import {
  getAdminApiToken,
  getAdminCookieName,
  isAdminSessionValid,
} from "@/lib/auth";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:9090";

async function forward(request: NextRequest, slug: string[]) {
  const session = request.cookies.get(getAdminCookieName())?.value;
  if (!isAdminSessionValid(session)) {
    return NextResponse.json(
      { error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  }

  const targetPath = slug.join("/");
  const bodyBuffer =
    request.method === "GET" || request.method === "DELETE"
      ? undefined
      : await request.arrayBuffer();

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/${targetPath}`, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${getAdminApiToken()}`,
      ...(request.headers.get("content-type")
        ? { "Content-Type": request.headers.get("content-type") as string }
        : {}),
    },
    body: bodyBuffer,
    cache: "no-store",
  });

  const responseBody = await response.arrayBuffer();
  const nextResponse = new NextResponse(responseBody, {
    status: response.status,
  });
  const contentType = response.headers.get("content-type");
  if (contentType) {
    nextResponse.headers.set("Content-Type", contentType);
  }
  return nextResponse;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;
  return forward(request, slug);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;
  return forward(request, slug);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;
  return forward(request, slug);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;
  return forward(request, slug);
}
