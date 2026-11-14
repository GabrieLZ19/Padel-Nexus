import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getApiUpstreamUrl } from "./upstream";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function filterRequestHeaders(incoming: Headers): Headers {
  const out = new Headers();
  incoming.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      HOP_BY_HOP.has(lower) ||
      lower === "host" ||
      lower === "content-length" ||
      lower === "accept-encoding"
    ) {
      return;
    }
    out.set(key, value);
  });
  return out;
}

function filterResponseHeaders(upstream: Headers): Headers {
  const out = new Headers();
  upstream.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      HOP_BY_HOP.has(lower) ||
      lower === "set-cookie" ||
      lower === "content-encoding" ||
      lower === "content-length"
    ) {
      return;
    }
    out.set(key, value);
  });
  return out;
}

export async function forwardToApiUpstream(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const upstreamBase = getApiUpstreamUrl();
  const targetPath = pathSegments.map(encodeURIComponent).join("/");
  const url = `${upstreamBase}/${targetPath}${request.nextUrl.search}`;

  const cookieStore = await cookies();
  const token = cookieStore.get("padel_token")?.value;

  const headers = filterRequestHeaders(request.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const init: RequestInit = {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  };

  const upstreamRes = await fetch(url, init);
  const responseHeaders = filterResponseHeaders(upstreamRes.headers);

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}
