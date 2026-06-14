"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Trophy,
  ClipboardList,
  Building2,
  Users,
  ShoppingBag,
  Shield,
  Activity,
  MessageSquare,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "../../utils/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((open) => !open);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Estado para almacenar los datos reales del usuario logueado
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getActiveSession = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;
        setCurrentUser(user);
      } catch (err) {
        console.error("Error obteniendo el usuario en el Layout:", err);
        router.push("/"); // Si no hay sesión válida, redirigimos afuera
      } finally {
        setLoading(false);
      }
    };

    getActiveSession();

    // Escuchamos cambios de estado de autenticación por si expira o cambia la sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      if (!session) {
        router.push("/");
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log("Sesión finalizada.");
      router.push("/");
      router.refresh(); // Crucial para limpiar las cookies de SSR y las rutas del servidor
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Torneos", icon: Trophy, href: "/dashboard/torneos" },
    {
      name: "Inscripciones",
      icon: ClipboardList,
      href: "/dashboard/inscripciones",
    },
    { name: "Clubes", icon: Building2, href: "/dashboard/clubes" },
    { name: "Jugadores", icon: Users, href: "/dashboard/jugadores" },
    { name: "Marketplace", icon: ShoppingBag, href: "/dashboard/marketplace" },
    { name: "Moderación", icon: Shield, href: "/dashboard/moderacion" },
    { name: "Estadísticas", icon: Activity, href: "/dashboard/estadisticas" },
    { name: "Chat interno", icon: MessageSquare, href: "/dashboard/chat" },
  ];

  // Extraemos un nombre legible basado en los datos del usuario
  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split("@")[0] ||
    "Admin";

  return (
    <div className="flex h-screen bg-padel-1 text-white font-sans overflow-hidden">
      {/* Barra Lateral (Sidebar) */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 transform bg-padel-1 flex flex-col shrink-0 border-r border-padel-3 shadow-xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-28 px-6 flex items-center justify-between gap-3 border-b border-white/10 md:border-none">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-padel-4 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.15)]">
              <span className="text-padel-1 font-bold text-2xl leading-none">
                ∞
              </span>
            </div>
            <div className="flex flex-col justify-center mt-1">
              <span className="text-base md:text-xl tracking-tight text-white flex items-baseline">
                <span className="font-extrabold">padel</span>
                <span className="font-light">nexus</span>
              </span>
              <span className="text-[10px] text-padel-4 font-bold tracking-[0.2em] -mt-1">
                ADMIN CRM
              </span>
            </div>
          </div>
          <button
            onClick={closeMobileMenu}
            className="md:hidden p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-none">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="block relative group"
              >
                <motion.div
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors ${
                    isActive
                      ? "bg-padel-4 text-padel-1 font-bold"
                      : "text-gray-400 hover:bg-padel-5 hover:text-white"
                  }`}
                  whileHover={!isActive ? { x: 4 } : {}}
                >
                  <item.icon
                    className={`size-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`}
                  />
                  <span className="text-[15px] tracking-wide">{item.name}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Perfil Inferior Dinámico con Datos de Supabase */}
        <div className="p-5 border-t border-padel-3 bg-padel-1 flex items-center gap-3">
          <div className="size-10 rounded-full bg-padel-5 flex items-center justify-center shrink-0 border border-padel-2">
            <User className="size-5 text-gray-400" />
          </div>

          <div className="flex flex-col flex-1 overflow-hidden">
            {loading ? (
              <div className="h-4 bg-padel-2 rounded w-24 animate-pulse"></div>
            ) : (
              <span className="text-sm font-bold text-white truncate capitalize">
                {displayName}
              </span>
            )}
            {loading ? (
              <div className="h-3 bg-padel-2 rounded w-32 mt-1.5 animate-pulse"></div>
            ) : (
              <span className="text-[11px] text-gray-500 truncate">
                {currentUser?.email}
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-padel-5 shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Contenedor Principal */}
      <main className="flex-1 overflow-y-auto bg-padel-1 scrollbar-thin scrollbar-thumb-padel-2 scrollbar-track-transparent">
        <div className="md:hidden sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-padel-1 px-4 py-3">
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-xl bg-padel-5 text-padel-1 hover:bg-padel-4 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-3 justify-center">
            <div className="size-10 bg-padel-4 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.15)]">
              <span className="text-padel-1 font-bold text-lg">∞</span>
            </div>
            <div className="min-w-0 text-center">
              <div className="text-sm font-black uppercase tracking-[0.35em] text-white leading-none">
                padel nexus
              </div>
              <div className="text-[10px] font-semibold text-padel-4 uppercase tracking-[0.25em]">
                admin crm
              </div>
            </div>
          </div>
          <div className="w-10" />
        </div>
        {children}
      </main>
    </div>
  );
}
