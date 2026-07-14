import { NextResponse, type NextRequest } from "next/server";
import { esRolAdministrativo } from "@/utils/auth/roles";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("padel_token")?.value;
  const userRole = request.cookies.get("padel_user_role")?.value || "usuario";
  const { pathname } = request.nextUrl;

  const isPlayerRoute = pathname.startsWith("/mi-perfil");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isClubRoute = pathname.startsWith("/club");
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isAdminOrMod = esRolAdministrativo(userRole);

  // --- REGLAS DE ACCESO BASADAS EN COOKIES DE API ---

  // 1. Si no hay token e intenta entrar a áreas privadas
  if (!token && (isPlayerRoute || isDashboardRoute || isClubRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Si es admin_club
  if (token && userRole === "admin_club") {
    // Redirigir a /club si intenta ir a áreas no autorizadas (dashboard, login/signup o raíz)
    if (isDashboardRoute || isAuthRoute || pathname === "/") {
      return NextResponse.redirect(new URL("/club", request.url));
    }
  }

  // 3. Si no es un rol administrativo (usuario común) e intenta ir a dashboard o club
  if (token && !isAdminOrMod && (isDashboardRoute || isClubRoute)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 4. Si es admin_club e intenta entrar a /club -> permitido. Si es otro admin y entra a /club -> permitido por flexibilidad
  // 5. Si es admin general/mod logueado e intenta ir a login/signup o raíz -> Redirigir a dashboard
  if (token && userRole !== "admin_club" && isAdminOrMod) {
    if (isAuthRoute || pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
