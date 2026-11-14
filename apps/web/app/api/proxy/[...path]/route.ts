import { NextRequest } from "next/server";
import { forwardToApiUpstream } from "@/utils/bff/proxyForward";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  if (!path?.length) {
    return new Response(JSON.stringify({ error: "Ruta de proxy inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return forwardToApiUpstream(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
