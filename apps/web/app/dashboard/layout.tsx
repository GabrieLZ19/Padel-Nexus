"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const supabase = useMemo(() => createClient(), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const toggleMobileMenu = () => setMobileMenuOpen((open) => !open);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          window.location.href = "/";
          return;
        }

        setCurrentUser(session.user);
      } catch (err) {
        console.error("Error de autenticación:", err);
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        window.location.href = "/";
      } else {
        setCurrentUser(session?.user ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error crítico al cerrar sesión:", err);
    } finally {
      // Forzamos recarga total para limpiar estado y caché
      window.location.href = "/";
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

  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split("@")[0] ||
    "Admin";

  // LOADER PROFESIONAL
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#111111]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="size-16 bg-padel-4 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(204,255,0,0.2)]"
          >
            <span className="text-[#111] font-bold text-4xl">∞</span>
          </motion.div>
          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-padel-4"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 transform bg-[#111111] flex flex-col shrink-0 border-r border-white/5 shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-28 px-8 flex items-center justify-between gap-3 border-b border-white/5 md:border-none">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-padel-4 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.15)]">
              <span className="text-[#111] font-bold text-2xl leading-none">
                ∞
              </span>
            </div>
            <div className="flex flex-col justify-center mt-1">
              <span className="text-xl tracking-tight text-white">
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
            className="md:hidden p-2 rounded-full text-gray-400 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="block relative group"
              >
                <motion.div
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors ${isActive ? "bg-padel-4 text-[#111] font-bold" : "text-gray-400 hover:bg-white/5"}`}
                >
                  <item.icon className="size-5" />
                  <span className="text-[14px]">{item.name}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 bg-[#111111] flex items-center gap-3">
          <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <User className="size-5 text-gray-400" />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-[13px] font-bold text-white truncate">
              {displayName}
            </span>
            <span className="text-[11px] text-gray-500 truncate">
              {currentUser.email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 text-gray-500 hover:text-red-500 transition-colors rounded-xl"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={closeMobileMenu}
        ></div>
      )}

      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="md:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#111111]/80 backdrop-blur-md">
          <button
            onClick={toggleMobileMenu}
            className="p-2.5 rounded-xl bg-white/5"
          >
            <Menu className="size-5" />
          </button>
          <div className="text-[13px] font-black uppercase tracking-[0.35em] text-white">
            PADEL NEXUS
          </div>
          <div className="w-10" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
