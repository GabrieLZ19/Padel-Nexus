"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Smartphone, User } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  // Matriz de rutas para mapear fácilmente
  const navLinks = [
    { name: "Torneos", path: "/torneos" },
    { name: "Ranking", path: "/ranking" },
    { name: "Reservar", path: "/reservar" },
    { name: "Marketplace", path: "/marketplace" },
    { name: "Clubes", path: "/clubes" },
  ];

  return (
    <header className="flex items-center justify-between px-10 py-6 border-b border-white/5 bg-padel-1 sticky top-0 z-50">
      {/* Lado Izquierdo: Logo y Enlaces */}
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center cursor-pointer">
          <div className="bg-padel-4 text-padel-1 font-black p-1.5 rounded-md text-sm leading-none">
            ∞
          </div>
          <span className="ml-2 text-xl font-bold tracking-tight text-white">
            padel
          </span>
          <span className="text-xl tracking-tight text-white">nexus</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
          {navLinks.map((link) => {
            // Lógica para detectar si la ruta actual coincide con el enlace
            const isActive = pathname.startsWith(link.path);

            return (
              <Link
                key={link.name}
                href={link.path}
                className={`transition-colors ${
                  isActive ? "text-padel-4" : "text-gray-400 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Lado Derecho: Acciones (Iconos idénticos a tu maqueta) */}
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all">
          <Search className="size-5" />
        </button>
        <button className="hidden md:flex items-center gap-2 bg-padel-4 hover:opacity-90 text-padel-1 px-5 py-2.5 rounded-xl font-bold text-sm transition-all">
          <Smartphone className="size-4" /> Descargar app
        </button>
        <Link
          href="/login"
          className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <User className="size-5" />
        </Link>
      </div>
    </header>
  );
}
