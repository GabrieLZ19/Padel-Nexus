// apps/web/app/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session) {
      // 1. Consultar el perfil del usuario para saber su rol
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", session.user.id)
        .single();

      // 2. Redirección condicional
      if (perfil?.rol === "admin" || perfil?.rol === "moderador") {
        return NextResponse.redirect(`${origin}/dashboard`);
      } else {
        return NextResponse.redirect(`${origin}/`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
