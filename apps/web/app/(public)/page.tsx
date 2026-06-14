"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trophy, TrendingUp, Play } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Redirigimos a la página de torneos pasando la búsqueda por la URL
      router.push(`/torneos?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/torneos`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-padel-4 selection:text-black">
      {/* HERO SECTION */}
      <main className="max-w-[1600px] mx-auto px-10 pt-24 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Columna Izquierda: Copy & CTAs */}
        <div className="space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-padel-4/30 bg-padel-4/10 text-padel-4 text-xs font-bold tracking-wider">
            <span className="size-1.5 rounded-full bg-padel-4"></span>
            TORNEOS · RANKING · RESERVAS · MARKETPLACE
          </div>

          <h1 className="text-6xl md:text-[80px] font-extrabold tracking-tight leading-[1.05]">
            El ecosistema del <br /> pádel, <br /> en una sola plataforma
          </h1>

          <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
            Inscribite a torneos, seguí tu ranking, reservá canchas y comprá tu
            equipamiento. Todo en Padel Nexus.
          </p>

          {/* Buscador Principal */}
          <form
            onSubmit={handleSearch}
            className="flex items-center p-2 bg-[#151515] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl focus-within:border-padel-4/50 transition-colors"
          >
            <Search className="size-5 text-gray-500 ml-4 mr-3" />
            <input
              type="text"
              placeholder="Buscá torneos, clubes o jugadores"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-white focus:outline-none placeholder-gray-500 text-base"
            />
            <button
              type="submit"
              className="bg-padel-4 hover:bg-padel-3 text-black px-8 py-3.5 rounded-xl font-bold transition-all ml-2"
            >
              Buscar
            </button>
          </form>

          {/* Botones de App Stores */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/10 bg-padel-1 hover:bg-white/5 transition-all">
              <svg className="size-6 text-white fill-white" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.31-.88 3.5-.8 1.48.06 2.76.62 3.56 1.63-3.15 1.87-2.6 6.01.5 7.33-.74 1.83-1.63 3.32-2.64 4.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <div className="text-left">
                <div className="text-[10px] text-gray-400 uppercase font-semibold leading-none">
                  Descargá en
                </div>
                <div className="text-sm font-bold leading-tight">App Store</div>
              </div>
            </button>
            <button className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/10 bg-padel-1 hover:bg-white/5 transition-all">
              <Play className="size-6 text-white fill-white" />
              <div className="text-left">
                <div className="text-[10px] text-gray-400 uppercase font-semibold leading-none">
                  Disponible en
                </div>
                <div className="text-sm font-bold leading-tight">
                  Google Play
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Columna Derecha: Composición Visual */}
        <div className="relative w-full aspect-square max-w-lg mx-auto lg:ml-auto flex items-center justify-center">
          {/* Brillo de fondo (Glow) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-padel-4/10 blur-[120px] rounded-full pointer-events-none"></div>

          {/* Tarjeta Central Oscura */}
          <div className="relative w-full h-[80%] bg-[#0f0f0f] border border-white/5 rounded-[40px] shadow-2xl flex items-center justify-center">
            {/* Logo de Padel Nexus Brillante */}
            <div className="bg-padel-4 w-48 h-48 rounded-[40px] flex items-center justify-center shadow-[0_0_80px_rgba(204,255,0,0.25)]">
              <span className="text-black text-[100px] font-black leading-none">
                ∞
              </span>
            </div>

            {/* Tarjeta Flotante Superior: Próximo Torneo */}
            <div className="absolute top-12 left-0 bg-[#1a1a1a] border border-white/10 px-5 py-4 rounded-2xl flex items-center gap-4 shadow-2xl transform -translate-x-8">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <Trophy className="size-5 text-padel-4  " />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  Próximo torneo
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  Apertura Pilar · Sáb
                </div>
              </div>
            </div>

            {/* Tarjeta Flotante Inferior: Ranking */}
            <div className="absolute bottom-12 right-0 bg-[#1a1a1a] border border-white/10 px-5 py-4 rounded-2xl flex items-center gap-4 shadow-2xl transform translate-x-8">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <TrendingUp className="size-5 text-padel-4" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  Tu ranking
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  #12 · +3 esta semana
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ESTADÍSTICAS INFERIORES */}
      <section className="border-t border-white/5 bg-[#0d0d0d]">
        <div className="max-w-[1600px] mx-auto px-10 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/5">
          <div className="space-y-3">
            <div className="text-5xl font-black text-padel-4">+25.000</div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Jugadores activos
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-5xl font-black text-padel-4">1.200</div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Torneos por año
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-5xl font-black text-padel-4">340</div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Clubes adheridos
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-5xl font-black text-padel-4">2.800</div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Canchas disponibles
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
