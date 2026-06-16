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
import { createClient } from "@/utils/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Image from "next/image";
import { useProfileStore } from "@/store/useProfileStore";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Estados de Autenticación
  const { profile, fetchProfile } = useProfileStore();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();

    // Escuchar cambios de sesión (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
    router.push("/login");
  };

  const navLinks = [
    { name: "Torneos", path: "/torneos" },
    { name: "Ranking", path: "/ranking" },
    { name: "Reservar", path: "/reservar" },
    { name: "Marketplace", path: "/marketplace" },
    { name: "Clubes", path: "/clubes" },
  ];

  // Extraer nombre e iniciales
  const userName =
    profile?.nombre_completo ||
    user?.user_metadata?.nombre_completo ||
    user?.user_metadata?.full_name ||
    "Usuario";
  const userInitials = userName.substring(0, 2).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="border-b border-white/5 bg-padel-1/95 backdrop-blur-xl relative top-0 z-50">
      <div className="flex items-center justify-between px-6 md:px-10 py-4 md:py-6">
        <div className="flex items-center gap-5 md:gap-12">
          <Link href="/" className="flex items-center cursor-pointer gap-3">
            <div className="bg-padel-4 text-padel-1 font-black p-1.5 rounded-md text-sm leading-none">
              ∞
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tracking-tight text-white">
                padel
              </span>
              <span className="text-xl tracking-tight text-white">nexus</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.path);
              return (
                <Link
                  key={link.name}
                  href={link.path}
                  className={`transition-colors duration-200 ${
                    isActive ? "text-padel-4" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-4 relative">
          <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200">
            <Search className="size-5" />
          </button>

          <button className="hidden md:flex items-center gap-2 bg-padel-4 hover:bg-padel-3 text-padel-1 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm shadow-padel-4/20">
            <Smartphone className="size-4" /> Descargar app
          </button>

          {/* Menú de Usuario Desktop */}
          <div className="hidden md:block relative">
            {user ? (
              <>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 transition-all duration-200"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={userName}
                      className="size-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-7 rounded-full bg-padel-4 text-padel-1 flex items-center justify-center text-xs font-bold">
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
                    <div className="absolute right-0 mt-3 w-56 bg-[#161616] border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-white/5 mb-2">
                        <p className="text-sm font-bold text-white truncate">
                          {userName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>

                      <Link
                        href="/mi-perfil"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LayoutDashboard className="size-4 text-gray-400" /> Mi
                        Panel
                      </Link>

                      <Link
                        href="/mi-perfil/ajustes"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Settings className="size-4 text-gray-400" />{" "}
                        Configuración
                      </Link>

                      <div className="h-px bg-white/5 my-2"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <User className="size-5" />
              </Link>
            )}
          </div>

          <button
            className="md:hidden w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
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
          className={`md:hidden bg-[#0d0d0d] border-t border-white/10 shadow-xl transition-transform duration-300 ease-out ${
            isClosing ? "translate-y-0 opacity-0" : "translate-y-0 opacity-100"
          }`}
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
            {/* Info Usuario Mobile */}
            {user && (
              <div className="flex items-center gap-3 px-2 pb-4 border-b border-white/5">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={userName}
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-10 rounded-full bg-padel-4 text-padel-1 flex items-center justify-center text-sm font-bold">
                    {userInitials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
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
                        ? "bg-padel-4/10 text-padel-4"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white rounded-2xl transition-colors"
                  >
                    <LayoutDashboard className="size-4" /> Mi Panel
                  </Link>
                  <Link
                    href="/dashboard/perfil"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white rounded-2xl transition-colors"
                  >
                    <Settings className="size-4" /> Configuración
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded-2xl transition-colors w-full text-left"
                  >
                    <LogOut className="size-4" /> Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-padel-4 px-4 py-3 text-sm font-bold text-padel-1 transition duration-200 ease-out hover:bg-padel-3 hover:opacity-95 shadow-md shadow-padel-4/15">
                    <Smartphone className="size-4" /> Descargar app
                  </button>
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 transition duration-200 ease-out hover:bg-white/5 hover:text-white"
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
