"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, Smartphone, User } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const navLinks = [
    { name: "Torneos", path: "/torneos" },
    { name: "Ranking", path: "/ranking" },
    { name: "Reservar", path: "/reservar" },
    { name: "Marketplace", path: "/marketplace" },
    { name: "Clubes", path: "/clubes" },
  ];

  return (
    <header className=" border-b border-white/5 bg-padel-1/95 backdrop-blur-xl relative top-0 z-50">
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

        <div className="flex items-center gap-3 md:gap-4">
          <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200">
            <Search className="size-5" />
          </button>

          <button className="hidden md:flex items-center gap-2 bg-padel-4 hover:bg-padel-3 text-padel-1 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm shadow-padel-4/20">
            <Smartphone className="size-4" /> Descargar app
          </button>

          <button
            className="md:hidden w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            onClick={() => {
              if (isMenuOpen) {
                setIsClosing(true);
              } else {
                setIsMenuOpen(true);
              }
            }}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>

          <Link
            href="/login"
            className=" md:inline-flex w-10 h-10 rounded-full border border-white/10 hidden items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <User className="size-5" />
          </Link>
        </div>
      </div>

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
                        : "text-gray-300 hover:bg-white/5 hover:text-white hover:-translate-y-0.5"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-3 pt-2">
              <button className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-padel-4 px-4 py-3 text-sm font-bold text-padel-1 transition duration-200 ease-out hover:bg-padel-3 hover:opacity-95 hover:-translate-y-0.5 shadow-md shadow-padel-4/15">
                <Smartphone className="size-4" /> Descargar app
              </button>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 transition duration-200 ease-out hover:bg-white/5 hover:text-white hover:-translate-y-0.5"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="size-4" /> Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
