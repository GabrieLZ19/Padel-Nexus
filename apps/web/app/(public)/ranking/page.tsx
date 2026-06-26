"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Trophy,
  TrendingUp,
  TrendingDown,
  Crown,
  Search,
  X,
  Medal,
} from "lucide-react";

import { RankingsService } from "@/utils/services/ranking";
import { RankingJugador } from "@/utils/types";
import { PROVINCIAS_ARG, NIVELES_PADEL } from "@/utils/constants/padelConfig";
import CustomDropdown from "@/components/ui/CustomDropdown";
import Image from "next/image";

export default function RankingPublicPage() {
  const [rankings, setRankings] = useState<RankingJugador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // --- ESTADOS DE FILTRADO Y BÚSQUEDA ---
  const [search, setSearch] = useState<string>("");
  const [activeScope, setActiveScope] = useState<string>("Provincial");
  const [activeProvincia, setActiveProvincia] = useState<string>(
    PROVINCIAS_ARG[0].value,
  );
  const [activeCategory, setActiveCategory] = useState<string>("Todas");

  // REFERENCIA DE CONTROL DE CONTROL VISUAL
  const isFirstLoad = useRef(true);

  // --- EFECTO PRINCIPAL DE CARGA ---
  useEffect(() => {
    let ignore = false;

    const fetchRankings = async () => {
      if (isFirstLoad.current) {
        setLoading(true);
      } else {
        setIsUpdating(true);
      }

      try {
        const params = {
          scope: activeScope,
          provincia: activeScope === "Global" ? undefined : activeProvincia,
          categoria: activeCategory === "Todas" ? undefined : activeCategory,
        };

        const data = await RankingsService.getGlobal(params);

        if (!ignore) {
          setRankings(Array.isArray(data) ? data : []);
          isFirstLoad.current = false;
        }
      } catch (error) {
        console.error("Error al obtener rankings:", error);
        if (!ignore) setRankings([]);
      } finally {
        if (!ignore) {
          setLoading(false);
          // Agregamos un micro-delay para que la transición de salida de la opacidad sea suave
          setTimeout(() => {
            setIsUpdating(false);
          }, 100);
        }
      }
    };

    fetchRankings();

    return () => {
      ignore = true;
    };
  }, [activeScope, activeProvincia, activeCategory]);

  // Filtrado puramente de búsqueda en memoria
  const filteredRankings = rankings.filter((player) => {
    const nombre = player.perfiles?.nombre_completo?.toLowerCase() || "";
    const club =
      player.perfiles?.clubes?.nombre?.toLowerCase() ||
      player.club_nombre?.toLowerCase() ||
      "";
    const query = search.toLowerCase();
    return nombre.includes(query) || club.includes(query);
  });

  const sortedRankings = [...filteredRankings].sort(
    (a, b) => b.puntos - a.puntos,
  );

  const top1 = sortedRankings[0] || null;
  const top2 = sortedRankings[1] || null;
  const top3 = sortedRankings[2] || null;
  const tablePlayers = sortedRankings.slice(3);

  const opcionesProvincias = PROVINCIAS_ARG.map((p) => ({
    value: p.value,
    label: p.label,
  }));

  const opcionesCategorias = [
    { value: "Todas", label: "Categorías" },
    ...NIVELES_PADEL.map((n) => ({ value: n.value, label: n.label })),
  ];

  return (
    <div className="min-h-screen bg-brand-black text-brand-white font-sans selection:bg-brand-chartreuse selection:text-brand-black pb-20">
      <main className="max-w-7xl mx-auto px-5 lg:px-10 pt-8 lg:pt-12">
        {/* ENCABEZADO Y TOOLBAR UNIFICADA (MENSAJE ELIMINADO COMPLETAMENTE) */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-[48px] font-black leading-tight tracking-tight text-transparent bg-clip-text bg-linear-to-r from-brand-white to-gray-500">
            Ranking Oficial
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-2 font-medium">
            Temporada {new Date().getFullYear()} · Actualizado en tiempo real
          </p>
        </div>

        {/* TOOLBAR FLOTANTE */}
        <div className="bg-brand-card p-3 md:p-4 rounded-3xl border border-brand-white/10 flex flex-col xl:flex-row gap-4 xl:gap-6 items-stretch xl:items-center shadow-2xl mb-12">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
            <input
              type="text"
              placeholder="Buscar jugador o club..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 bg-brand-black border border-brand-white/5 rounded-2xl text-sm font-medium text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-white bg-brand-white/5 rounded-full p-1 transition-colors cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="hidden xl:block w-px h-10 bg-brand-white/10" />

          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Pestañas de Alcance */}
            <div className="flex bg-brand-black p-1.5 rounded-2xl border border-brand-white/5 h-13 items-center w-full lg:w-auto overflow-x-auto hide-scrollbar">
              {["Provincial", "Nacional", "Global"].map((scope) => (
                <button
                  key={scope}
                  onClick={() => setActiveScope(scope)}
                  className={`flex-1 lg:flex-none px-4 md:px-8 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all h-full whitespace-nowrap cursor-pointer ${
                    activeScope === scope
                      ? "bg-brand-chartreuse text-brand-black shadow-[0_0_15px_rgba(203,254,1,0.2)]"
                      : "text-gray-400 hover:text-brand-white hover:bg-brand-white/5"
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>

            {/* Dropdowns */}
            <div className="flex gap-3 w-full lg:w-auto z-30">
              {activeScope !== "Global" && (
                <div className="flex-1 lg:w-48 h-13">
                  <CustomDropdown
                    value={activeProvincia}
                    onChange={(val) => setActiveProvincia(val)}
                    options={opcionesProvincias}
                    placeholder="Provincia"
                  />
                </div>
              )}
              <div className="flex-1 lg:w-48 h-13">
                <CustomDropdown
                  value={activeCategory}
                  onChange={(val) => setActiveCategory(val)}
                  options={opcionesCategorias}
                  placeholder="Categoría"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- RENDERIZADO CON ANIMACIÓN DE TRANSICIÓN CINEMÁTICA --- */}
        {loading ? (
          <div className="w-full animate-pulse space-y-6">
            <div className="flex justify-center items-end gap-6 mb-16 h-75">
              <div className="w-1/3 max-w-75 h-50 bg-brand-white/5 rounded-t-3xl" />
              <div className="w-1/3 max-w-[320px] h-70 bg-brand-white/10 rounded-t-3xl" />
              <div className="w-1/3 max-w-75 h-45 bg-brand-white/5 rounded-t-3xl" />
            </div>
            <div className="bg-brand-white/5 rounded-3xl h-100" />
          </div>
        ) : sortedRankings.length === 0 ? (
          <div className="w-full py-32 px-6 text-center border border-dashed border-brand-white/10 rounded-3xl bg-brand-card text-gray-500 animate-in fade-in duration-300">
            <Trophy className="size-16 mx-auto mb-6 opacity-30 text-brand-chartreuse" />
            <p className="text-lg font-medium text-gray-400">
              Aún no hay jugadores registrados en esta categoría.
            </p>
          </div>
        ) : (
          // ➡️ ANIMACIÓN ENTRE ESTADOS: Agregamos blur-[2px] y transiciones suavizadas (duration-300 ease-out)
          <div
            className={`transition-all duration-300 ease-out ${
              isUpdating
                ? "opacity-40 blur-[2px] scale-[0.995] pointer-events-none"
                : "opacity-100 blur-0 scale-100"
            }`}
          >
            {/* TOP 3 PODIO PROFESIONAL */}
            <div className="flex flex-col md:flex-row justify-center items-center md:items-end gap-y-16 gap-x-6 lg:gap-x-8 mb-16 pt-16 md:pt-10">
              {/* PUESTO #2 (Plata) */}
              <div className="order-2 md:order-1 w-full md:w-70 bg-linear-to-b from-gray-500/10 to-brand-card border border-gray-500/20 rounded-3xl md:rounded-t-[40px] md:rounded-b-2xl p-6 lg:p-8 flex flex-col items-center text-center h-65 justify-end relative shadow-lg">
                <div className="absolute top-4 left-4 md:hidden text-4xl font-black text-gray-500/20">
                  2
                </div>
                <div className="absolute -top-10 w-20 h-20 bg-brand-black border-4 border-brand-card rounded-full flex items-center justify-center text-gray-400 overflow-hidden shadow-lg z-10">
                  {top2?.perfiles?.avatar_url ? (
                    <Image
                      src={top2.perfiles.avatar_url}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="size-8 opacity-50" />
                  )}
                </div>
                <Medal className="text-gray-400 size-6 mb-2 mt-4 md:mt-0" />
                <div className="font-black text-xl text-brand-white truncate w-full px-2 mb-1">
                  {top2?.perfiles?.nombre_completo || "A confirmar"}
                </div>
                <div className="text-gray-400 text-sm font-semibold mb-3">
                  {top2?.perfiles?.clubes?.nombre || "Particular"}
                </div>
                <div className="bg-gray-500/10 text-gray-300 px-4 py-1.5 rounded-full text-sm font-bold border border-gray-500/20">
                  {top2 ? `${top2.puntos.toLocaleString()} pts` : "-"}
                </div>
              </div>

              {/* PUESTO #1 (Oro / Neón) */}
              <div className="order-1 md:order-2 w-full md:w-85 bg-linear-to-b from-brand-chartreuse/15 to-brand-card border border-brand-chartreuse/40 rounded-3xl md:rounded-t-[48px] md:rounded-b-2xl p-6 lg:p-10 flex flex-col items-center text-center h-80 justify-end relative shadow-[0_-10px_40px_rgba(203,254,1,0.08)] z-10">
                <div className="absolute top-4 right-4 md:hidden text-5xl font-black text-brand-chartreuse/10">
                  1
                </div>
                <div className="absolute -top-6 bg-brand-chartreuse text-brand-black w-12 h-12 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(203,254,1,0.4)] z-30">
                  <Crown className="size-6" />
                </div>
                <div className="absolute -top-14 w-28 h-28 bg-brand-black border-4 border-brand-card rounded-full flex items-center justify-center text-brand-chartreuse overflow-hidden shadow-[0_0_30px_rgba(203,254,1,0.2)] z-20">
                  {top1?.perfiles?.avatar_url ? (
                    <Image
                      src={top1.perfiles.avatar_url}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="size-10 opacity-50" />
                  )}
                </div>
                <div className="text-brand-chartreuse font-black text-lg tracking-widest uppercase mb-1 mt-4 md:mt-0">
                  Campeón
                </div>
                <div className="font-black text-2xl md:text-3xl text-brand-white truncate w-full px-2 mb-1">
                  {top1?.perfiles?.nombre_completo || "A confirmar"}
                </div>
                <div className="text-gray-400 text-sm font-semibold mb-4">
                  {top1?.perfiles?.clubes?.nombre || "Particular"}
                </div>
                <div className="bg-brand-chartreuse text-brand-black px-6 py-2 rounded-full text-base font-black shadow-[0_0_15px_rgba(203,254,1,0.2)]">
                  {top1 ? `${top1.puntos.toLocaleString()} pts` : "-"}
                </div>
              </div>

              {/* PUESTO #3 (Bronce) */}
              <div className="order-3 w-full md:w-70 bg-linear-to-b from-amber-700/15 to-brand-card border border-amber-700/30 rounded-3xl md:rounded-t-[40px] md:rounded-b-2xl p-6 lg:p-8 flex flex-col items-center text-center h-60 justify-end relative shadow-lg">
                <div className="absolute top-4 right-4 md:hidden text-4xl font-black text-amber-700/20">
                  3
                </div>
                <div className="absolute -top-10 w-20 h-20 bg-brand-black border-4 border-brand-card rounded-full flex items-center justify-center text-amber-700 overflow-hidden shadow-lg z-10">
                  {top3?.perfiles?.avatar_url ? (
                    <Image
                      src={top3.perfiles.avatar_url}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="size-8 opacity-50" />
                  )}
                </div>
                <Medal className="text-amber-600 size-6 mb-2 mt-4 md:mt-0" />
                <div className="font-black text-xl text-brand-white truncate w-full px-2 mb-1">
                  {top3?.perfiles?.nombre_completo || "A confirmar"}
                </div>
                <div className="text-gray-400 text-sm font-semibold mb-3">
                  {top3?.perfiles?.clubes?.nombre || "Particular"}
                </div>
                <div className="bg-amber-700/20 text-amber-500 px-4 py-1.5 rounded-full text-sm font-bold border border-amber-700/30">
                  {top3 ? `${top3.puntos.toLocaleString()} pts` : "-"}
                </div>
              </div>
            </div>

            {/* VISTA MÓVIL: TARJETAS */}
            <div className="md:hidden flex flex-col gap-3">
              {tablePlayers.map((player, index) => {
                const posicionReal = index + 4;
                return (
                  <div
                    key={player.id}
                    className="bg-brand-card border border-brand-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-white/5 flex items-center justify-center font-bold text-gray-400 text-sm shrink-0">
                      {posicionReal}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-brand-white truncate">
                          {player.perfiles?.nombre_completo || "Desconocido"}
                        </span>
                        <span className="bg-brand-white/10 px-2 py-0.5 rounded-md text-[10px] font-bold text-brand-chartreuse uppercase shrink-0">
                          {player.categoria}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {player.perfiles?.clubes?.nombre || "Particular"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-black text-brand-chartreuse text-base">
                        {player.puntos}
                      </span>
                      {(player.tendencia || 0) > 0 ? (
                        <span className="flex items-center text-[10px] font-black text-green-500">
                          <TrendingUp className="size-3 mr-0.5" /> +
                          {player.tendencia}
                        </span>
                      ) : (player.tendencia || 0) < 0 ? (
                        <span className="flex items-center text-[10px] font-black text-red-500">
                          <TrendingDown className="size-3 mr-0.5" />{" "}
                          {Math.abs(player.tendencia!)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-bold">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA ESCRITORIO: TABLA COMPLETA */}
            <div className="hidden md:block bg-brand-card rounded-4xl border border-brand-white/5 overflow-hidden shadow-2xl">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-white/5 text-gray-500 text-xs font-bold uppercase tracking-widest bg-brand-black/40">
                      <th className="py-5 px-8 w-20 text-center">Pos</th>
                      <th className="py-5 px-6">Jugador</th>
                      <th className="py-5 px-6">Categoría</th>
                      <th className="py-5 px-6">Club</th>
                      <th className="py-5 px-6 text-center">PJ</th>
                      <th className="py-5 px-6 text-center">PG</th>
                      <th className="py-5 px-6 text-center">Efec.</th>
                      <th className="py-5 px-8 text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-white/5">
                    {tablePlayers.map((player, index) => {
                      const partidosJugados = player.pj || 0;
                      const partidosGanados = player.pg || 0;
                      const efectividad =
                        partidosJugados > 0
                          ? `${Math.round((partidosGanados / partidosJugados) * 100)}%`
                          : "0%";
                      const posicionReal = index + 4;

                      return (
                        <tr
                          key={player.id}
                          className="hover:bg-brand-white/5 transition-colors group"
                        >
                          <td className="py-5 px-8 text-center font-black text-base text-gray-500 group-hover:text-brand-white transition-colors">
                            {posicionReal}
                          </td>
                          <td className="py-5 px-6 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-black border border-brand-white/10 flex items-center justify-center text-gray-500 overflow-hidden shrink-0 group-hover:border-brand-chartreuse/50 transition-colors shadow-sm relative">
                              {player.perfiles?.avatar_url ? (
                                <Image
                                  src={player.perfiles.avatar_url}
                                  alt="Avatar"
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <User className="size-4" />
                              )}
                            </div>
                            <span className="font-bold text-sm text-gray-200 group-hover:text-brand-white transition-colors">
                              {player.perfiles?.nombre_completo ||
                                "Jugador Desconocido"}
                            </span>
                          </td>
                          <td className="py-5 px-6">
                            <span className="bg-brand-white/5 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold uppercase">
                              {player.categoria}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-sm font-medium text-gray-400">
                            {player.perfiles?.clubes?.nombre || "Particular"}
                          </td>
                          <td className="py-5 px-6 text-sm font-bold text-gray-400 text-center">
                            {partidosJugados}
                          </td>
                          <td className="py-5 px-6 text-sm font-bold text-gray-400 text-center">
                            {partidosGanados}
                          </td>
                          <td className="py-5 px-6 text-sm font-black text-gray-300 text-center">
                            {efectividad}
                          </td>
                          <td className="py-5 px-8 text-right">
                            <div className="flex items-center justify-end gap-4">
                              <span className="font-black text-brand-chartreuse text-base">
                                {player.puntos.toLocaleString()}
                              </span>
                              {(player.tendencia || 0) > 0 ? (
                                <span className="flex items-center text-xs font-black text-green-500 w-10 justify-end">
                                  <TrendingUp className="size-4 mr-1" /> +
                                  {player.tendencia}
                                </span>
                              ) : (player.tendencia || 0) < 0 ? (
                                <span className="flex items-center text-xs font-black text-red-500 w-10 justify-end">
                                  <TrendingDown className="size-4 mr-1" />{" "}
                                  {Math.abs(player.tendencia!)}
                                </span>
                              ) : (
                                <span className="w-10 text-center text-gray-600 font-bold text-xs">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
