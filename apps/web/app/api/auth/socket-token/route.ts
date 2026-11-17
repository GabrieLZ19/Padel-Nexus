import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { validateSessionToken } from "@/utils/bff/validateSessionToken";

/** Entrega el JWT de sesión al cliente para el handshake de Socket.IO (cookie HttpOnly). */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("padel_token")?.value?.trim();

  if (!token || token === "undefined" || token === "null") {
    return NextResponse.json({ error: "Sin sesión activa" }, { status: 401 });
  }

  const verified = await validateSessionToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
  }

  return NextResponse.json({ token });
}