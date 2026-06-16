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
          cookiesToSet.forEach(({ name, value }) =>
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

  const isPlayerRoute = pathname.startsWith("/mi-perfil");

  // Extraemos el rol de la metadata de Supabase (blindaje de seguridad)
  const userRole = user?.app_metadata?.rol || "usuario";
  const isAdminOrMod = userRole === "admin" || userRole === "moderador";

  // Identificadores de rutas
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // --- REGLAS DE ACCESO ---

  if (!user && isPlayerRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 1. Si NO está logueado e intenta entrar al dashboard -> Mandarlo a /login
  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Si ESTÁ logueado pero NO es admin/mod e intenta entrar al dashboard -> Mandarlo a la landing "/"
  if (user && !isAdminOrMod && isDashboardRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3. Si ESTÁ logueado e intenta ir a /login o /signup -> Redirigir según su rol
  if (user && isAuthRoute) {
    if (isAdminOrMod) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 4. Si es admin y está en la landing "/", enviarlo al dashboard
  if (pathname === "/" && user && isAdminOrMod) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 5. Si es usuario normal logueado y está en "/", no hacer nada (cargar landing)
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
