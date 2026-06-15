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
      router.push(`/torneos?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/torneos`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-padel-4 selection:text-black">
      <main className="max-w-[1600px] mx-auto px-6 sm:px-10 pt-20 pb-16 sm:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-padel-4/30 bg-padel-4/10 text-padel-4 text-[11px] font-bold tracking-wider whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-padel-4"></span>
            TORNEOS · RANKING · RESERVAS · MARKETPLACE
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-[72px] lg:text-[80px] font-extrabold tracking-tight leading-[1.05]">
            El ecosistema del <br /> pádel, <br /> en una sola plataforma
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-xl leading-relaxed">
            Inscribite a torneos, seguí tu ranking, reservá canchas y comprá tu
            equipamiento. Todo en Padel Nexus.
          </p>

          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 p-2 bg-[#151515] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl focus-within:border-padel-4/50 transition-colors"
          >
            <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#111111]">
              <Search className="size-5 text-gray-500" />
              <input
                type="text"
                placeholder="Buscá torneos, clubes o jugadores"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-white focus:outline-none placeholder-gray-500 text-base"
              />
            </label>
            <button
              type="submit"
              className="inline-flex justify-center items-center min-h-13.5 bg-padel-4 hover:bg-padel-3 text-black px-8 rounded-xl font-bold transition-all"
            >
              Buscar
            </button>
          </form>

          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 pt-4">
            <button className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/10 bg-padel-1 hover:bg-white/5 transition-all w-full sm:w-auto">
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
            <button className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/10 bg-padel-1 hover:bg-white/5 transition-all w-full sm:w-auto">
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

        <div className="relative w-full max-w-3xl mx-auto flex items-center justify-center">
          <div className="relative w-full min-h-105 sm:min-h-130 md:min-h-145 bg-[#0f0f0f] border border-white/5 rounded-[40px] shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="bg-padel-4 w-44 h-44 sm:w-48 sm:h-48 rounded-[40px] flex items-center justify-center shadow-[0_0_80px_rgba(204,255,0,0.25)]">
              <span className="text-black text-[90px] sm:text-[100px] font-black leading-none">
                ∞
              </span>
            </div>

            <div className="absolute inset-x-0 top-6 sm:top-12 px-6 sm:px-0">
              <div className="mx-auto max-w-sm sm:max-w-xs bg-[#1a1a1a] border border-white/10 px-5 py-4 rounded-2xl flex items-center gap-4 shadow-2xl sm:transform sm:-translate-x-8">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <Trophy className="size-5 text-padel-4" />
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
            </div>

            <div className="absolute inset-x-0 bottom-6 sm:bottom-12 px-6 sm:px-0">
              <div className="mx-auto max-w-sm sm:max-w-xs bg-[#1a1a1a] border border-white/10 px-5 py-4 rounded-2xl flex items-center gap-4 shadow-2xl sm:transform sm:translate-x-8">
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
        </div>
      </main>

      <section className="border-t border-white/5 bg-[#0d0d0d]">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center divide-y divide-white/5 sm:divide-y-0 sm:divide-x">
          <div className="space-y-3 py-6">
            <div className="text-5xl sm:text-6xl font-black text-padel-4">
              +25.000
            </div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Jugadores activos
            </div>
          </div>
          <div className="space-y-3 py-6">
            <div className="text-5xl sm:text-6xl font-black text-padel-4">
              1.200
            </div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Torneos por año
            </div>
          </div>
          <div className="space-y-3 py-6">
            <div className="text-5xl sm:text-6xl font-black text-padel-4">
              340
            </div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Clubes adheridos
            </div>
          </div>
          <div className="space-y-3 py-6">
            <div className="text-5xl sm:text-6xl font-black text-padel-4">
              2.800
            </div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Canchas disponibles
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
