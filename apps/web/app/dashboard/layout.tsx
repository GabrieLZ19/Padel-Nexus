"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import Image from "next/image";
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
  Sun,
  Moon,
} from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import NotificationCenter from "@/components/notificaciones/NotificationCenter";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // 🚀 Usamos EXCLUSIVAMENTE la store, como en las vistas públicas
  const { profile, fetchProfile, clearProfile } = useProfileStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";

    const updateDOM = () => {
      setTheme(nextTheme);
      localStorage.setItem("theme", nextTheme);
      if (nextTheme === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
    };

    if (!document.startViewTransition) {
      updateDOM();
    } else {
      document.startViewTransition(() => {
        flushSync(() => {
          updateDOM();
        });
      });
    }
  };

  const toggleMobileMenu = () => setMobileMenuOpen((open) => !open);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = useCallback(() => {
    clearProfile();
    document.cookie = "padel_token=; path=/; max-age=0;";
    document.cookie = "padel_user_role=; path=/; max-age=0;";
    setMobileMenuOpen(false);
    setLoading(false);

    router.replace("/login");
  }, [clearProfile, router]);

  // Reemplazá los dos useEffect de tu DashboardLayout por este único bloque:
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      // 1. Si ya tenemos el perfil en RAM, cortamos el loader y nos quedamos.
      if (profile) {
        setLoading(false);
        return;
      }

      // 2. Si no lo tenemos (F5), lo vamos a buscar al backend
      const recuperadoConExito = await fetchProfile();

      if (isMounted) {
        if (!recuperadoConExito) {
          // 3. Si falló (token expirado o backend apagado), lo echamos limpiamente
          handleLogout();
        } else {
          // 4. Si lo recuperó, sacamos el loader y mostramos el panel
          setLoading(false);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
    };
  }, [fetchProfile, handleLogout, profile]);

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

  const formatNombreCompleto = (apellido?: string | null, nombre?: string | null) => {
    const ap = (apellido || "").trim();
    const nom = (nombre || "").trim();
    if (ap && nom) return `${ap.toUpperCase()}, ${nom}`;
    if (ap) return ap.toUpperCase();
    if (nom) return nom;
    return "";
  };

  const displayName =
    formatNombreCompleto(profile?.apellido, profile?.nombre) ||
    profile?.email?.split("@")[0] ||
    "Admin";

  // Mantenemos el Loader si está cargando O si está a punto de expulsar por falta de perfil
  if (loading || !profile) {
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
            className="size-16 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(204,255,0,0.2)] bg-[#cbfe01]"
          >
            <Image
              src="/brand/LogoAccessory.svg"
              alt="Padel Nexus"
              width={40}
              height={40}
              className="object-contain"
            />
          </motion.div>
          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-chartreuse"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-black text-brand-white font-sans overflow-hidden">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 transform bg-[#111111] flex flex-col shrink-0 border-r border-white/5 shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-28 px-8 flex items-center justify-between gap-3 border-b border-white/5 md:border-none">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.15)] bg-[#cbfe01]">
              <Image
                src="/brand/LogoAccessory.svg"
                alt="Padel Nexus"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col justify-center mt-1">
              <span className="text-xl tracking-tight text-brand-white">
                <span className="font-extrabold">padel</span>
                <span className="font-light">nexus</span>
              </span>
              <span className="text-[10px] text-brand-chartreuse font-bold tracking-[0.2em] -mt-1">
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
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors ${isActive ? "bg-brand-chartreuse text-[#111] font-bold" : "text-gray-400 hover:bg-white/5"}`}
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
            <span className="text-[13px] font-bold text-brand-white truncate">
              {displayName}
            </span>
            <span className="text-[11px] text-gray-500 truncate">
              {profile.email}
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-white transition-colors rounded-xl mr-1"
            title="Cambiar tema"
          >
            {theme === "light" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 text-gray-500 hover:text-red-500 transition-colors rounded-xl"
            title="Cerrar sesión"
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

      <main className="flex-1 overflow-y-auto bg-brand-black">
        <div className="md:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#111111]/80 backdrop-blur-md">
          <button
            onClick={toggleMobileMenu}
            className="p-2.5 rounded-xl bg-white/5"
          >
            <Menu className="size-5" />
          </button>
          <Image
            src="/brand/Logo.svg"
            alt="Padel Nexus"
            width={100}
            height={40}
            className="object-contain"
          />
          <div className="flex items-center justify-center">
            <NotificationCenter />
          </div>
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
