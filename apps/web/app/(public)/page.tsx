"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Trophy, TrendingUp, Play, Calendar } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { RankingsService } from "@/utils/services/ranking";
import { Torneo, RankingJugador } from "@/utils/types";

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Estados para los widgets
  const [tournaments, setTournaments] = useState<Torneo[]>([]);
  const [rankings, setRankings] = useState<RankingJugador[]>([]);

  useEffect(() => {
    // Control sutil de promesas adaptado a las respuestas seguras del backend ({ data })
    Promise.all([
      TorneosService.getAll().catch(() => ({ data: [] })),
      RankingsService.getGlobal().catch(() => ({ data: [] })),
    ])
      .then(([tData, rData]) => {
        // Validación de estructuras para prevenir fallos de tipos en cascada
        const listadoTorneos = Array.isArray(tData) ? tData : tData?.data || [];
        const listadoRankings = Array.isArray(rData)
          ? rData
          : rData?.data || [];

        setTournaments(listadoTorneos.slice(0, 4));
        setRankings(listadoRankings.slice(0, 5));
      })
      .catch((err) =>
        console.log("Manejo de consulta de perfiles e invitados:", err.message),
      );
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/torneos?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/torneos`);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-white font-sans selection:bg-brand-chartreuse selection:text-brand-black relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* El destello verde oliva/musgo de la esquina superior derecha */}
        <div className="absolute -top-50 -right-37.5 w-162.5 h-162.5 rounded-full bg-brand-moss opacity-20 blur-[140px]" />

        {/* El destello chartreuse sutil de apoyo en la zona izquierda */}
        <div className="absolute top-[20%] -left-50 w-137.5 h-137.5 rounded-full bg-brand-chartreuse opacity-5 blur-[160px]" />
      </div>
      {/* --- HERO SECTION --- */}
      <main className="max-w-[1600px] mx-auto px-6 sm:px-10 pt-20 pb-16 sm:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-chartreuse/30 bg-brand-chartreuse/10 text-brand-chartreuse text-[11px] font-bold tracking-wider whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-brand-chartreuse"></span>
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
            className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 p-2 bg-[#151515] border border-brand-white/10 rounded-2xl w-full max-w-xl shadow-2xl focus-within:border-brand-chartreuse/50 transition-colors"
          >
            <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#111111]">
              <Search className="size-5 text-gray-500" />
              <input
                type="text"
                placeholder="Buscá torneos, clubes o jugadores"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-brand-white focus:outline-none placeholder-gray-500 text-base"
              />
            </label>
            <button
              type="submit"
              className="inline-flex justify-center items-center min-h-13.5 bg-brand-chartreuse hover:opacity-90 text-brand-black px-8 rounded-xl font-bold transition-all cursor-pointer"
            >
              Buscar
            </button>
          </form>

          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 pt-4">
            <button className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-brand-white/10 bg-brand-card hover:bg-brand-white/5 transition-all w-full sm:w-auto cursor-pointer">
              <svg
                className="size-6 text-brand-white fill-brand-white"
                viewBox="0 0 24 24"
              >
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.31-.88 3.5-.8 1.48.06 2.76.62 3.56 1.63-3.15 1.87-2.6 6.01.5 7.33-.74 1.83-1.63 3.32-2.64 4.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <div className="text-left">
                <div className="text-[10px] text-gray-400 uppercase font-semibold leading-none">
                  Descargá en
                </div>
                <div className="text-sm font-bold leading-tight">App Store</div>
              </div>
            </button>
            <button className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-brand-white/10 bg-brand-card hover:bg-brand-white/5 transition-all w-full sm:w-auto cursor-pointer">
              <Play className="size-6 text-brand-white fill-brand-white" />
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

        {/* --- CONTENEDOR HERO DERECHO CON GLOW EN CAPAS --- */}
        <div className="relative w-full max-w-3xl mx-auto flex items-center justify-center">
          <div className="relative w-full min-h-105 sm:min-h-130 md:min-h-145 bg-[#0f0f0f]/90 border border-brand-white/5 rounded-[40px] shadow-2xl flex items-center justify-center overflow-hidden backdrop-blur-sm">
            {/* Logo de accesorio con sombra difusa controlada */}
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center z-10 transition-transform duration-300 hover:scale-105 filter drop-shadow-[0_0_40px_rgba(203,254,1,0.25)]">
              <Image
                src="/brand/LogoAccessory.svg"
                alt="Isotipo Padel Nexus"
                width={192}
                height={192}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            {/* Card del Próximo Torneo */}
            <div className="absolute inset-x-0 top-6 sm:top-12 px-6 sm:px-0 z-20">
              <div className="mx-auto max-w-sm sm:max-w-xs bg-[#1a1a1a]/90 backdrop-blur-md border border-brand-white/10 px-5 py-4 rounded-2xl flex items-center gap-4 shadow-2xl sm:transform sm:-translate-x-8">
                <div className="bg-brand-white/5 p-2.5 rounded-xl border border-brand-white/5">
                  <Trophy className="size-5 text-brand-chartreuse" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                    Próximo torneo
                  </div>
                  <div className="text-sm font-bold text-brand-white mt-0.5">
                    Apertura Pilar · Sáb
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- WIDGETS INTEGRADOS (Torneos y Ranking) --- */}
      <section className="max-w-[1600px] mx-auto px-6 sm:px-10 py-16 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold">Próximos Torneos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tournaments.length > 0 ? (
              tournaments.map((t) => (
                <div
                  key={t.id}
                  className="bg-brand-card p-5 rounded-2xl border border-brand-white/5 hover:border-brand-chartreuse/30 transition-all"
                >
                  <div className="flex gap-4">
                    <div className="bg-brand-chartreuse/10 p-3 rounded-xl h-fit">
                      <Calendar className="size-6 text-brand-chartreuse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-white">{t.nombre}</h3>
                      <p className="text-xs text-brand-chartreuse font-bold mt-2">
                        {t.fecha
                          ? new Date(t.fecha).toLocaleDateString()
                          : "Fecha a confirmar"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">
                No hay torneos programados en este momento.
              </p>
            )}
          </div>
        </div>

        <div className="bg-brand-card p-8 rounded-3xl border border-brand-white/5 space-y-6">
          <div className="flex items-center gap-2 text-brand-chartreuse">
            <TrendingUp className="size-5" />
            <h2 className="text-xl font-bold text-brand-white">
              Top 5 Ranking
            </h2>
          </div>
          <div className="space-y-4">
            {rankings.length > 0 ? (
              rankings.map((r, i) => (
                <div
                  key={r.usuario_id || i}
                  className="flex items-center justify-between border-b border-brand-white/5 pb-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-600">0{i + 1}</span>
                    <span className="text-sm font-medium">
                      {r.perfiles?.nombre ? `${r.perfiles.apellido?.toUpperCase()}, ${r.perfiles.nombre}` : "Jugador anónimo"}
                    </span>
                  </div>
                  <span className="text-brand-chartreuse font-bold">
                    {r.puntos} pts
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">
                Estadísticas de clasificación no disponibles.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* --- SECCIÓN METRICAS / STATS DEL FOOTER --- */}
      <section className="border-t border-brand-white/5 bg-[#0d0d0d] relative z-10">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center divide-y divide-brand-white/5 sm:divide-y-0 sm:divide-x divide-solid">
          <div className="space-y-3 py-6">
            <div className="text-5xl sm:text-6xl font-black text-brand-chartreuse">
              +25.000
            </div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Jugadores activos
            </div>
          </div>
          <div className="space-y-3 py-6 sm:pl-4">
            <div className="text-5xl sm:text-6xl font-black text-brand-chartreuse">
              1.200
            </div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Torneos por año
            </div>
          </div>
          <div className="space-y-3 py-6 sm:pl-4">
            <div className="text-5xl sm:text-6xl font-black text-brand-chartreuse">
              340
            </div>
            <div className="text-sm text-gray-400 font-semibold tracking-wide">
              Clubes adheridos
            </div>
          </div>
          <div className="space-y-3 py-6 sm:pl-4">
            <div className="text-5xl sm:text-6xl font-black text-brand-chartreuse">
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
