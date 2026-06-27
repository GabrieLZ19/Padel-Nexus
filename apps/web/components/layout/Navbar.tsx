"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Search,
  Smartphone,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { useProfileStore } from "@/store/useProfileStore";
import NotificationCenter from "@/components/notificaciones/NotificationCenter";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Consumo exclusivo del Store de Zustand centralizado
  const { profile, fetchProfile, clearProfile } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = () => {
    // 1. Borramos de forma efectiva las cookies de sesión para Next.js Middleware y Axios
    document.cookie =
      "padel_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "padel_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // 2. Limpiamos el estado global de la app
    clearProfile();
    setIsDropdownOpen(false);
    setIsMenuOpen(false);

    // 3. Redirección limpia
    router.push("/login");
  };

  const navLinks = [
    { name: "Torneos", path: "/torneos" },
    { name: "Ranking", path: "/ranking" },
    { name: "Reservar", path: "/reservar" },
    { name: "Marketplace", path: "/marketplace" },
    { name: "Clubes", path: "/clubes" },
  ];

  // Extraer nombre directamente del perfil unificado de nuestra API
  const userName = profile?.nombre ? `${profile.apellido?.toUpperCase()}, ${profile.nombre}` : "";

  // Calculamos las iniciales de forma dinámica basándonos en el nombre real
  const userInitials =
    userName && userName.trim()
      ? userName
          .trim()
          .split(/\s+/)
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
          : "PN"; // Fallback transitorio

  const avatarUrl = profile?.avatar_url || null;

  return (
    <header className="border-b border-brand-white/5 bg-brand-black/95 backdrop-blur-xl relative top-0 z-50">
      <div className="flex items-center justify-between px-6 md:px-10 py-4 md:py-6">
        <div className="flex items-center gap-5 md:gap-12">
          {/* LOGO OFICIAL */}
          <Link href="/" className="flex items-center cursor-pointer">
            <Image
              src="/brand/Logo.svg"
              alt="Padel Nexus"
              width={180}
              height={45}
              className="h-9 md:h-11 w-auto"
              priority
            />
          </Link>

          {/* Menú Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.path);
              return (
                <Link
                  key={link.name}
                  href={link.path}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? "text-brand-chartreuse"
                      : "text-gray-400 hover:text-brand-white"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-4 relative">
          <button className="w-10 h-10 rounded-full border border-brand-white/10 flex items-center justify-center text-gray-400 hover:text-brand-white hover:bg-brand-white/5 transition-all duration-200 cursor-pointer">
            <Search className="size-5" />
          </button>

          {/* Centro de Notificaciones */}
          <NotificationCenter />

          {/* Botón Descargar App */}
          <button className="hidden md:flex items-center gap-2 bg-brand-chartreuse hover:opacity-90 text-brand-black px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm shadow-brand-chartreuse/20 cursor-pointer">
            <Smartphone className="size-4" /> Descargar app
          </button>

          {/* Menú de Usuario Desktop basado en Zustand */}
          <div className="hidden md:block relative">
            {profile ? (
              <>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-brand-white/10 hover:bg-brand-white/5 transition-all duration-200 cursor-pointer"
                >
                  {avatarUrl ? (
                    <div className="relative size-7">
                      <Image
                        src={avatarUrl}
                        alt="Perfil"
                        fill
                        className="rounded-full object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="size-7 rounded-full bg-brand-chartreuse text-brand-black flex items-center justify-center text-xs font-bold">
                      {userInitials}
                    </div>
                  )}
                  <ChevronDown
                    className={`size-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Desktop */}
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-3 w-56 bg-brand-card border border-brand-white/10 rounded-2xl shadow-xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-brand-white/5 mb-2">
                        <p className="text-sm font-bold text-brand-white truncate">
                          {userName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {profile.email}
                        </p>
                      </div>

                      <Link
                        href={
                          profile.rol !== "usuario"
                            ? "/dashboard"
                            : "/mi-perfil"
                        }
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-brand-white hover:bg-brand-white/5 transition-colors"
                      >
                        <LayoutDashboard className="size-4 text-gray-400" /> Mi
                        Panel
                      </Link>

                      <Link
                        href="/mi-perfil/ajustes"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-brand-white hover:bg-brand-white/5 transition-colors"
                      >
                        <Settings className="size-4 text-gray-400" />{" "}
                        Configuración
                      </Link>

                      <div className="h-px bg-brand-white/5 my-2"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="size-4" /> Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="w-10 h-10 rounded-full border border-brand-white/10 flex items-center justify-center text-gray-400 hover:text-brand-white hover:bg-brand-white/5 transition-all duration-200"
              >
                <User className="size-5" />
              </Link>
            )}
          </div>

          <button
            className="md:hidden w-10 h-10 rounded-full border border-brand-white/10 flex items-center justify-center text-gray-400 hover:text-brand-white hover:bg-brand-white/5 transition-all duration-200 cursor-pointer"
            onClick={() => {
              if (isMenuOpen) {
                setIsClosing(true);
              } else {
                setIsMenuOpen(true);
              }
            }}
          >
            {isMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Menú Mobile */}
      {(isMenuOpen || isClosing) && (
        <div
          className="md:hidden bg-brand-black border-t border-brand-white/10 shadow-xl transition-transform duration-300 ease-out"
          style={{
            animation: `${isClosing ? "navbar-menu-close 300ms ease-out forwards" : "navbar-menu-open 300ms ease-out forwards"}`,
          }}
          onAnimationEnd={() => {
            if (isClosing) {
              setIsMenuOpen(false);
              setIsClosing(false);
            }
          }}
        >
          <div className="px-6 py-5 space-y-4">
            {profile && (
              <div className="flex items-center gap-3 px-2 pb-4 border-b border-brand-white/5">
                <div className="size-10 rounded-full bg-brand-chartreuse text-brand-black flex items-center justify-center text-sm font-bold">
                  {userInitials}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-white truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {profile.email}
                  </p>
                </div>
              </div>
            )}

            <nav className="grid gap-3 text-sm font-semibold">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.name}
                    href={link.path}
                    className={`block rounded-2xl px-4 py-3 transition duration-200 ease-out ${
                      isActive
                        ? "bg-brand-chartreuse/10 text-brand-chartreuse"
                        : "text-gray-300 hover:bg-brand-white/5 hover:text-brand-white"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-3 pt-4 border-t border-brand-white/5">
              {profile ? (
                <>
                  <Link
                    href={
                      profile.rol !== "usuario" ? "/dashboard" : "/mi-perfil"
                    }
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white rounded-2xl transition-colors"
                  >
                    <LayoutDashboard className="size-4" /> Mi Panel
                  </Link>
                  <Link
                    href="/mi-perfil/ajustes"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white rounded-2xl transition-colors"
                  >
                    <Settings className="size-4" /> Configuración
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded-2xl transition-colors w-full text-left cursor-pointer"
                  >
                    <LogOut className="size-4" /> Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-white/10 bg-brand-chartreuse px-4 py-3 text-sm font-bold text-brand-black transition duration-200 ease-out hover:opacity-90 shadow-md shadow-brand-chartreuse/15 cursor-pointer">
                    <Smartphone className="size-4" /> Descargar app
                  </button>
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-white/10 px-4 py-3 text-sm font-semibold text-gray-300 transition duration-200 ease-out hover:bg-white/5 hover:text-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="size-4" /> Iniciar sesión
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
