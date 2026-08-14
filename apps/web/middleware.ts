import { NextResponse, type NextRequest } from "next/server";
import { esRolAccesoCrm } from "@/utils/auth/roles";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("padel_token")?.value;
  const userRole = request.cookies.get("padel_user_role")?.value || "usuario";
  const { pathname } = request.nextUrl;

  const isPlayerRoute = pathname.startsWith("/mi-perfil");
  const isMensajesRoute = pathname.startsWith("/mensajes");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isClubRoute = pathname.startsWith("/club");
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const puedeCrm = esRolAccesoCrm(userRole);

  // --- REGLAS DE ACCESO BASADAS EN COOKIES DE API ---

  // 1. Si no hay token e intenta entrar a áreas privadas
  if (
    !token &&
    (isPlayerRoute || isMensajesRoute || isDashboardRoute || isClubRoute)
  ) {
    const loginUrl = new URL("/login", request.url);
    if (isMensajesRoute) {
      loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Si es admin_club
  if (token && userRole === "admin_club") {
    // Redirigir a /club si intenta ir a áreas no autorizadas (dashboard, login/signup o raíz)
    if (isDashboardRoute || isAuthRoute || pathname === "/") {
      return NextResponse.redirect(new URL("/club", request.url));
    }
  }

  // 3. Si no es un rol con acceso al CRM (usuario común) e intenta ir a dashboard o club
  if (token && !puedeCrm && (isDashboardRoute || isClubRoute)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 4. Si es admin_club e intenta entrar a /club -> permitido. Si es otro admin y entra a /club -> permitido por flexibilidad
  // 5. Si es admin / fiscal logueado e intenta ir a login/signup o raíz -> Redirigir a dashboard
  if (token && userRole !== "admin_club" && puedeCrm) {
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
