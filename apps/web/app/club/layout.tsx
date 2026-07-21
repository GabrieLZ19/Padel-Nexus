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
  Grid,
  Calendar,
  Settings,
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
import { useSocket } from "@/hooks/useSocket";
import { ChatService } from "@/utils/services/chat";
import { sileo } from "sileo";

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, fetchProfile, clearProfile } = useProfileStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [chatNoLeidos, setChatNoLeidos] = useState(0);

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

  const handleLogout = useCallback(() => {
    clearProfile();
    document.cookie = "padel_token=; path=/; max-age=0;";
    document.cookie = "padel_user_role=; path=/; max-age=0;";
    setMobileMenuOpen(false);
    router.replace("/login");
  }, [clearProfile, router]);

  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      if (profile) {
        // Impedir que entren usuarios que no son admin_club a menos que sean admin general
        if (profile.rol !== "admin_club" && profile.rol !== "superadmin" && profile.rol !== "admin_federacion") {
          router.replace("/");
          return;
        }
        setLoading(false);
        return;
      }

      const recuperadoConExito = await fetchProfile();
      if (isMounted) {
        if (!recuperadoConExito) {
          handleLogout();
        } else {
          setLoading(false);
        }
      }
    };
    initSession();
    return () => {
      isMounted = false;
    };
  }, [fetchProfile, handleLogout, profile, router]);

  // Cargar no leídos y notificaciones en tiempo real
  useEffect(() => {
    ChatService.getNoLeidos()
      .then((total) => setChatNoLeidos(total))
      .catch(() => {});

    const handler = () => {
      ChatService.getNoLeidos()
        .then((total) => setChatNoLeidos(total))
        .catch(() => {});
    };

    window.addEventListener("chat_notification", handler);
    return () => window.removeEventListener("chat_notification", handler);
  }, []);

  useSocket((newNotif: any) => {
    const payload = { title: newNotif.titulo, description: newNotif.mensaje };
    switch (newNotif.tipo) {
      case "success": sileo.success(payload); break;
      case "error": sileo.error(payload); break;
      case "warning": sileo.warning(payload); break;
      default: sileo.info(payload); break;
    }
  });

  const menuItems = [
    { name: "Mi Club", icon: LayoutDashboard, href: "/club" },
    { name: "Torneos", icon: Trophy, href: "/club/torneos" },
    { name: "Canchas", icon: Grid, href: "/club/canchas" },
    { name: "Reservas", icon: Calendar, href: "/club/reservas" },
    { name: "Chat interno", icon: MessageSquare, href: "/club/chat", badge: chatNoLeidos },
    { name: "Configuración", icon: Settings, href: "/club/configuracion" },
  ];

  const displayName = profile?.nombre && profile?.apellido
    ? `${profile.apellido.toUpperCase()}, ${profile.nombre}`
    : profile?.email?.split("@")[0] || "Club Admin";

  if (loading || !profile) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#111111]">
        <div className="flex flex-col items-center gap-6">
          <div className="size-16 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(204,255,0,0.2)] bg-[#cbfe01]">
            <Image
              src="/brand/LogoAccessory.svg"
              alt="Padel Nexus"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-chartreuse"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-black text-brand-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 transform bg-[#111111] flex flex-col shrink-0 border-r border-white/5 shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
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
                CLUB PANEL
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2 rounded-full text-gray-400 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} className="block relative group">
                <div
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors ${
                    isActive ? "bg-brand-chartreuse text-[#111] font-bold" : "text-gray-400 hover:bg-white/5"
                  }`}
                >
                  <item.icon className="size-5" />
                  <span className="text-[14px] flex-1">{item.name}</span>
                  {("badge" in item) && (item as any).badge > 0 && (
                    <span className="min-w-5 h-5 flex items-center justify-center bg-brand-chartreuse text-brand-black rounded-full text-[10px] font-black px-1 shadow-[0_0_8px_rgba(203,254,1,0.3)]">
                      {(item as any).badge > 99 ? "99+" : (item as any).badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 bg-[#111111] flex items-center gap-3">
          <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <User className="size-5 text-gray-400" />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-[13px] font-bold text-brand-white truncate">{displayName}</span>
            <span className="text-[11px] text-gray-500 truncate">{profile.email}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-white transition-colors rounded-xl mr-1"
            title="Cambiar tema"
          >
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
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
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Main Panel */}
      <main className="flex-1 overflow-y-auto bg-brand-black">
        <div className="md:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-brand-card/80 backdrop-blur-md border-b border-brand-white/5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2.5 rounded-xl bg-brand-card text-brand-white border border-brand-white/10 cursor-pointer hover:bg-brand-card/80 transition-colors"
          >
            <Menu className="size-5" />
          </button>
          <Image
            src="/brand/Logo.svg"
            alt="Padel Nexus"
            width={100}
            height={40}
            className="object-contain dark:invert-0"
          />
          <NotificationCenter />
        </div>
        <div className="p-6 md:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
