import { NextResponse } from "next/server";
import {
  MAX_AGE_SESSION_DEFAULT,
  MAX_AGE_SESSION_REMEMBER,
  roleCookieOptions,
  sessionCookieOptions,
  SESSION_COOKIE_PATH,
} from "@/utils/bff/cookieOptions";

type SessionBody = {
  token?: string;
  role?: string;
  rememberMe?: boolean;
};

export async function POST(request: Request) {
  let body: SessionBody;
  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token || token === "undefined" || token === "null") {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const maxAge = body.rememberMe
    ? MAX_AGE_SESSION_REMEMBER
    : MAX_AGE_SESSION_DEFAULT;

  const response = NextResponse.json({ exito: true });
  response.cookies.set("padel_token", token, sessionCookieOptions(maxAge));

  if (body.role) {
    response.cookies.set(
      "padel_user_role",
      body.role,
      roleCookieOptions(maxAge),
    );
  }

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ exito: true });
  const cleared = {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.FORCE_SECURE_COOKIES === "1",
    sameSite: "lax" as const,
    path: SESSION_COOKIE_PATH,
    maxAge: 0,
  };
  response.cookies.set("padel_token", "", cleared);
  response.cookies.set("padel_user_role", "", {
    ...cleared,
    httpOnly: false,
  });
  return response;
}
