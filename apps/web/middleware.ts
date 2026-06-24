import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("padel_token")?.value;
  const userRole = request.cookies.get("padel_user_role")?.value || "usuario";
  const { pathname } = request.nextUrl;

  const isPlayerRoute = pathname.startsWith("/mi-perfil");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isAdminOrMod =
    userRole === "superadmin" ||
    userRole === "admin_federacion" ||
    userRole === "admin_provincial";

  // --- REGLAS DE ACCESO BASADAS EN COOKIES DE API ---

  // 1. Si no hay token e intenta entrar a áreas privadas
  if (!token && (isPlayerRoute || isDashboardRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Si está logueado pero no tiene rango FAP administrativo e intenta entrar al CRM
  if (token && !isAdminOrMod && isDashboardRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3. Si está logueado e intenta ir a login/signup -> Redirigir según jerarquía
  if (token && isAuthRoute) {
    return NextResponse.redirect(
      new URL(isAdminOrMod ? "/dashboard" : "/", request.url),
    );
  }

  // 4. Si es admin y está en la raíz pública, llevarlo al panel
  if (pathname === "/" && token && isAdminOrMod) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
