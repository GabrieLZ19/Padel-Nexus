"use client";

import { useState, useEffect } from "react";
import {
  User,
  Trophy,
  TrendingUp,
  TrendingDown,
  Crown,
  Search,
  X,
} from "lucide-react";

import { RankingsService } from "@/utils/services/ranking";
import { RankingJugador } from "@/utils/types";

// Importamos las constantes oficiales
import { PROVINCIAS_ARG, NIVELES_PADEL } from "@/utils/constants/padelConfig";

// Importamos el Dropdown que subiste
import CustomDropdown from "@/components/ui/CustomDropdown";
import Image from "next/image";

export default function RankingPublicPage() {
  const [rankings, setRankings] = useState<RankingJugador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- ESTADOS DE FILTRADO Y BÚSQUEDA ---
  const [search, setSearch] = useState<string>("");
  const [activeScope, setActiveScope] = useState<string>("Provincial");

  // Valores por defecto
  const [activeProvincia, setActiveProvincia] = useState<string>(
    PROVINCIAS_ARG[0].value,
  );
  const [activeCategory, setActiveCategory] = useState<string>("Todas");

  // --- EFECTO PRINCIPAL DE CARGA (Saneado de cascading renders) ---
  useEffect(() => {
    let ignore = false;

    const fetchRankings = async () => {
      setLoading(true);
      try {
        const params = {
          scope: activeScope,
          provincia: activeScope === "Global" ? undefined : activeProvincia,
          categoria: activeCategory === "Todas" ? undefined : activeCategory,
        };

        const data = await RankingsService.getGlobal(params);

        if (!ignore) {
          setRankings(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error al obtener rankings:", error);
        if (!ignore) setRankings([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchRankings();

    return () => {
      ignore = true; // Cleanup function previene memory leaks y setStates en desmontaje
    };
  }, [activeScope, activeProvincia, activeCategory]); // Dependencias limpias

  // Filtrado puramente de búsqueda en memoria (Input Search)
  const filteredRankings = rankings.filter((player) => {
    const nombre = player.perfiles?.nombre_completo?.toLowerCase() || "";
    // Aseguramos que la DB traiga club_nombre o en su defecto no crasheé
    const club = player.club_nombre?.toLowerCase() || "";
    const query = search.toLowerCase();
    return nombre.includes(query) || club.includes(query);
  });

  // Los rankings de la DB ya vienen ordenados por la Vista SQL, pero hacemos un fallback
  const sortedRankings = [...filteredRankings].sort(
    (a, b) => b.puntos - a.puntos,
  );

  const top1 = sortedRankings[0] || null;
  const top2 = sortedRankings[1] || null;
  const top3 = sortedRankings[2] || null;
  const tablePlayers = sortedRankings.slice(3);

  // Opciones formateadas para el CustomDropdown
  const opcionesProvincias = PROVINCIAS_ARG.map((p) => ({
    value: p.value,
    label: p.label,
  }));

  const opcionesCategorias = [
    { value: "Todas", label: "Todas las categorías" },
    ...NIVELES_PADEL.map((n) => ({ value: n.value, label: n.label })),
  ];

  return (
    <div className="min-h-screen bg-padel-1 text-white font-sans selection:bg-padel-4 selection:text-padel-1 pb-20">
      <main className="max-w-[1600px] mx-auto px-10 pt-12">
        {/* ENCABEZADO Y CONTROLES */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
          <div>
            <h1 className="text-[40px] font-bold leading-tight tracking-tight">
              Ranking de jugadores
            </h1>
            <p className="text-gray-400 mt-1">
              Temporada {new Date().getFullYear()} · Actualizado en tiempo real
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Input buscador reactivo */}
            <div className="relative flex-1 sm:flex-none sm:w-64 z-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-padel-5 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-padel-4/50 h-13"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Selector de Alcance (Tabs) */}
            <div className="flex bg-padel-5 p-1 rounded-xl border border-white/5 h-13 items-center">
              {["Provincial", "Nacional", "Global"].map((scope) => (
                <button
                  key={scope}
                  onClick={() => setActiveScope(scope)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all h-full ${
                    activeScope === scope
                      ? "bg-padel-4 text-padel-1 shadow-[0_0_10px_rgba(204,255,0,0.15)]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>

            {/* Implementamos CustomDropdown para Provincia y Categoría */}
            <div className="flex gap-4 z-40">
              {activeScope !== "Global" && (
                <div className="w-48">
                  <CustomDropdown
                    value={activeProvincia}
                    onChange={(val) => setActiveProvincia(val)}
                    options={opcionesProvincias}
                    placeholder="Provincia"
                  />
                </div>
              )}

              <div className="w-48">
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

        {/* --- RENDERIZADO CONDICIONAL --- */}
        {loading ? (
          <div className="w-full animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
              <div className="bg-padel-5/50 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center order-2 md:order-1 h-50">
                <div className="w-12 h-12 bg-white/5 rounded-full mb-3"></div>
                <div className="w-8 h-6 bg-white/5 rounded mb-2"></div>
                <div className="w-32 h-4 bg-white/5 rounded mt-2"></div>
              </div>
              <div className="bg-padel-5/50 border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center order-1 md:order-2 h-60 transform md:-translate-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full mb-3"></div>
                <div className="w-10 h-8 bg-white/5 rounded mb-2"></div>
                <div className="w-40 h-5 bg-white/5 rounded mt-2"></div>
              </div>
              <div className="bg-padel-5/50 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center order-3 h-50">
                <div className="w-12 h-12 bg-white/5 rounded-full mb-3"></div>
                <div className="w-8 h-6 bg-white/5 rounded mb-2"></div>
                <div className="w-32 h-4 bg-white/5 rounded mt-2"></div>
              </div>
            </div>
            <div className="bg-padel-5/50 rounded-3xl border border-white/5 overflow-hidden h-75"></div>
          </div>
        ) : sortedRankings.length === 0 ? (
          <div className="w-full py-24 text-center border border-dashed border-white/10 rounded-3xl bg-padel-5/20 text-gray-500">
            <Trophy className="size-12 mx-auto mb-4 opacity-50" />
            No existen registros de ranking cargados para el filtro
            seleccionado.
          </div>
        ) : (
          <>
            {/* TOP 3 PODIO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
              {/* PUESTO #2 */}
              <div className="bg-padel-5 border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center order-2 md:order-1 h-50 justify-center transition-all hover:border-white/10">
                <div className="w-12 h-12 bg-padel-1 border border-white/10 rounded-full flex items-center justify-center mb-3 text-gray-500 overflow-hidden">
                  {top2?.perfiles?.avatar_url ? (
                    <Image
                      src={top2.perfiles.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="size-5" />
                  )}
                </div>
                <div className="text-xl font-black text-gray-400 mb-0.5">
                  #2
                </div>
                <div className="font-bold text-base text-white truncate w-full">
                  {top2?.perfiles?.nombre_completo || "A confirmar"}
                </div>
                <div className="text-gray-400 text-xs font-semibold mt-0.5">
                  {top2 ? `${top2.puntos.toLocaleString()} pts` : "-"}
                </div>
              </div>

              {/* PUESTO #1 */}
              <div className="bg-[#141907] border border-padel-4 rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_0_40px_rgba(204,255,0,0.08)] relative order-1 md:order-2 h-60 justify-center transform md:-translate-y-4 transition-all">
                <div className="absolute -top-5 bg-padel-4 text-padel-1 w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.3)]">
                  <Crown className="size-5" />
                </div>
                <div className="w-16 h-16 bg-padel-4/10 border border-padel-4/20 rounded-full flex items-center justify-center mb-3 text-padel-4 overflow-hidden">
                  {top1?.perfiles?.avatar_url ? (
                    <Image
                      src={top1.perfiles.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="size-6" />
                  )}
                </div>
                <div className="text-3xl font-black text-padel-4 mb-0.5">
                  #1
                </div>
                <div className="font-bold text-lg text-white truncate w-full">
                  {top1?.perfiles?.nombre_completo || "A confirmar"}
                </div>
                <div className="text-padel-4 text-xs font-black tracking-wide mt-0.5">
                  {top1 ? `${top1.puntos.toLocaleString()} pts` : "-"}
                </div>
              </div>

              {/* PUESTO #3 */}
              <div className="bg-padel-5 border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center order-3 h-50 justify-center transition-all hover:border-white/10">
                <div className="w-12 h-12 bg-padel-1 border border-white/10 rounded-full flex items-center justify-center mb-3 text-gray-500 overflow-hidden">
                  {top3?.perfiles?.avatar_url ? (
                    <Image
                      src={top3.perfiles.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="size-5" />
                  )}
                </div>
                <div className="text-xl font-black text-amber-700 mb-0.5">
                  #3
                </div>
                <div className="font-bold text-base text-white truncate w-full">
                  {top3?.perfiles?.nombre_completo || "A confirmar"}
                </div>
                <div className="text-gray-400 text-xs font-semibold mt-0.5">
                  {top3 ? `${top3.puntos.toLocaleString()} pts` : "-"}
                </div>
              </div>
            </div>

            {/* TABLA PRINCIPAL */}
            <div className="bg-padel-5 rounded-3xl border border-white/5 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 text-[11px] font-bold uppercase tracking-wider bg-black/20">
                      <th className="py-4 px-6 w-16 text-center">#</th>
                      <th className="py-4 px-6">Jugador</th>
                      <th className="py-4 px-6">Categoría</th>
                      <th className="py-4 px-6">Provincia</th>
                      <th className="py-4 px-6 text-center">PJ</th>
                      <th className="py-4 px-6 text-center">PG</th>
                      <th className="py-4 px-6 text-center">Efec.</th>
                      <th className="py-4 px-6 text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tablePlayers.map((player, index) => {
                      const partidosJugados = player.pj || 0;
                      const partidosGanados = player.pg || 0;
                      const efectividad =
                        partidosJugados > 0
                          ? `${Math.round((partidosGanados / partidosJugados) * 100)}%`
                          : "0%";
                      const posicionReal = index + 4; // Ajuste por top 3

                      return (
                        <tr
                          key={player.id}
                          className="hover:bg-white/5 transition-colors group"
                        >
                          <td className="py-4 px-6 text-center font-bold text-sm text-gray-400">
                            {posicionReal}
                          </td>
                          <td className="py-4 px-6 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-padel-1 border border-white/10 flex items-center justify-center text-gray-500 overflow-hidden group-hover:border-padel-4/30 transition-colors">
                              {player.perfiles?.avatar_url ? (
                                <Image
                                  src={player.perfiles.avatar_url}
                                  alt="Avatar"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="size-4" />
                              )}
                            </div>
                            <span className="font-bold text-white group-hover:text-padel-4 transition-colors">
                              {player.perfiles?.nombre_completo ||
                                "Jugador Desconocido"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs font-semibold text-gray-300 uppercase">
                            {player.categoria}
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-400">
                            {player.provincia || "No registrada"}
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-400 text-center">
                            {partidosJugados}
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-400 text-center">
                            {partidosGanados}
                          </td>
                          <td className="py-4 px-6 text-xs font-bold text-white text-center">
                            {efectividad}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className="font-bold text-padel-4 text-sm">
                                {player.puntos.toLocaleString()}
                              </span>
                              {(player.tendencia || 0) > 0 ? (
                                <span className="flex items-center text-[10px] font-black text-green-500 w-8 justify-end">
                                  <TrendingUp className="size-3 mr-0.5" /> +
                                  {player.tendencia}
                                </span>
                              ) : (player.tendencia || 0) < 0 ? (
                                <span className="flex items-center text-[10px] font-black text-red-500 w-8 justify-end">
                                  <TrendingDown className="size-3 mr-0.5" />{" "}
                                  {Math.abs(player.tendencia!)}
                                </span>
                              ) : (
                                <span className="w-8 text-center text-gray-600 text-xs">
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
          </>
        )}
      </main>
    </div>
  );
}
