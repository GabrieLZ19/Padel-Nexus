"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Trophy, TrendingUp, Calendar } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { RankingsService } from "@/utils/services/ranking";
import {
  SitioPublicoService,
  type CifrasSitioPublico,
} from "@/utils/services/sitioPublico";
import { Torneo, RankingJugador } from "@/utils/types";
import { formatFechaCalendario } from "@/utils/formatFecha";

function formatoCifra(valor: number): string {
  return new Intl.NumberFormat("es-AR").format(valor);
}

function proximoPublico(lista: Torneo[]): Torneo | null {
  const hoy = new Date();
  const isoHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  return (
    lista
      .filter((torneo) => torneo.fecha && String(torneo.fecha).slice(0, 10) >= isoHoy)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))[0] || null
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Estados para los widgets
  const [tournaments, setTournaments] = useState<Torneo[]>([]);
  const [rankings, setRankings] = useState<RankingJugador[]>([]);
  const [cifras, setCifras] = useState<CifrasSitioPublico | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    Promise.all([
      TorneosService.getAll().catch(() => ({ data: [] })),
      RankingsService.getGlobal().catch(() => ({ data: [] })),
      SitioPublicoService.cifras().catch(() => null),
    ])
      .then(([tData, rData, cifrasData]) => {
        const listadoTorneos = Array.isArray(tData) ? tData : tData?.data || [];
        const listadoRankings = Array.isArray(rData)
          ? rData
          : rData?.data || [];

        setTournaments(listadoTorneos.slice(0, 4));
        setRankings(listadoRankings.slice(0, 5));
        setCifras(cifrasData);
        setListo(true);
      })
      .catch((err) =>
        console.log("Manejo de consulta de perfiles e invitados:", err.message),
      );
  }, []);

  const siguiente = proximoPublico(tournaments);

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
                className="w-full bg-transparent border-none text-brand-white focus:outline-none placeholder-gray-500 text-base p-2"
              />
            </label>
            <button
              type="submit"
              className="inline-flex justify-center items-center min-h-13.5 bg-brand-chartreuse hover:opacity-90 text-brand-black px-8 rounded-xl font-bold transition-all cursor-pointer"
            >
              Buscar
            </button>
          </form>

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

            {siguiente ? (
              <div className="absolute inset-x-0 top-6 sm:top-12 px-6 sm:px-0 z-20">
                <div className="mx-auto max-w-sm sm:max-w-xs bg-[#1a1a1a]/90 backdrop-blur-md border border-brand-white/10 px-5 py-4 rounded-2xl flex items-center gap-4 shadow-2xl sm:transform sm:-translate-x-8">
                  <div className="bg-brand-white/5 p-2.5 rounded-xl border border-brand-white/5">
                    <Trophy className="size-5 text-brand-chartreuse" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                      Próximo torneo
                    </div>
                    <div className="truncate text-sm font-bold text-brand-white mt-0.5">
                      {siguiente.nombre}
                      {siguiente.fecha
                        ? ` · ${formatFechaCalendario(siguiente.fecha)}`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* --- WIDGETS INTEGRADOS (Torneos y Ranking) --- */}
      <section className="max-w-[1600px] mx-auto px-6 sm:px-10 py-16 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold">Próximos Torneos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!listo ? null : tournaments.length > 0 ? (
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
                          ? formatFechaCalendario(t.fecha)
                          : "Fecha a confirmar"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">
                Todavía no hay torneos publicados. Cuando una sede abra la
                inscripción, van a aparecer acá.
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
            {!listo ? null : rankings.length > 0 ? (
              rankings.map((r, i) => (
                <div
                  key={r.usuario_id || i}
                  className="flex items-center justify-between border-b border-brand-white/5 pb-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-600">0{i + 1}</span>
                    <span className="text-sm font-medium">
                      {r.perfiles?.nombre
                        ? `${r.perfiles.apellido?.toUpperCase()}, ${r.perfiles.nombre}`
                        : "Jugador anónimo"}
                    </span>
                  </div>
                  <span className="text-brand-chartreuse font-bold">
                    {r.puntos} pts
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">
                Todavía no hay un ranking publicado. Los puntos aparecen cuando
                se cierran torneos oficiales.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* --- SECCIÓN METRICAS / STATS DEL FOOTER --- */}
      {cifras ? (
        <section className="border-t border-brand-white/5 bg-[#0d0d0d] relative z-10">
          <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center divide-y divide-brand-white/5 sm:divide-y-0 sm:divide-x divide-solid">
            {(
              [
                ["Jugadores", cifras.jugadores],
                ["Torneos", cifras.torneos],
                ["Clubes", cifras.clubes],
                ["Canchas", cifras.canchas],
              ] as const
            ).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="space-y-3 py-6 sm:pl-4 first:sm:pl-0">
                <div className="text-5xl sm:text-6xl font-black text-brand-chartreuse">
                  {formatoCifra(valor)}
                </div>
                <div className="text-sm text-gray-400 font-semibold tracking-wide">
                  {etiqueta}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
