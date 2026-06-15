import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Extraemos el rol de la metadata de Supabase (blindaje de seguridad)
  const userRole = user?.app_metadata?.rol || "usuario";
  const isAdminOrMod = userRole === "admin" || userRole === "moderador";

  // --- REGLAS DE ACCESO ---

  // 1. Si intenta entrar a /dashboard sin ser admin -> Redirigir a landing
  if (pathname.startsWith("/dashboard")) {
    if (!user || !isAdminOrMod) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 2. Si es admin y está en la landing "/", enviarlo al dashboard
  if (pathname === "/" && user && isAdminOrMod) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Si es usuario normal logueado y está en "/", no hacer nada (cargar landing)
  // Eliminamos cualquier redirección circular aquí.

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
