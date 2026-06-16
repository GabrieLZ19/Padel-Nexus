import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session) {
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", session.user.id)
        .single();

      if (perfil?.rol === "admin" || perfil?.rol === "moderador") {
        return NextResponse.redirect(`${origin}/dashboard`);
      } else {
        return NextResponse.redirect(`${origin}/`);
      }
    }
  }

  // Si falla el código (expiró o ya se usó)
  return NextResponse.redirect(
    `${origin}/login?error=El enlace de recuperación ha expirado o no es válido.`,
  );
}
