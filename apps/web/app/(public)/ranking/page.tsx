"use client";

import { useState, useEffect, useRef } from "react";

import {
  User,
  MapPin,
  ChevronDown,
  Trophy,
  TrendingUp,
  TrendingDown,
  Crown,
  Search,
  X,
} from "lucide-react";
import { RankingsService } from "@/utils/services/ranking";
import { RankingJugador } from "@/utils/types";

export default function RankingPublicPage() {
  const [rankings, setRankings] = useState<RankingJugador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- ESTADOS DE FILTRADO Y BÚSQUEDA ---
  const [search, setSearch] = useState<string>("");
  const [activeScope, setActiveScope] = useState<string>("Provincial");
  const [activeProvincia, setActiveProvincia] =
    useState<string>("Buenos Aires");
  const [activeCategory, setActiveCategory] = useState<string>("Todas");

  // --- DROPDOWNS ---
  const [isProvOpen, setIsProvOpen] = useState<boolean>(false);
  const [isCatOpen, setIsCatOpen] = useState<boolean>(false);
  const provRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const params = {
      scope: activeScope,
      provincia: activeScope === "Global" ? undefined : activeProvincia,
      categoria: activeCategory === "Todas" ? undefined : activeCategory,
    };

    RankingsService.getGlobal(params)
      .then((data) => {
        if (isMounted) {
          setRankings(data || []);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error al obtener rankings:", error);
        if (isMounted) setLoading(false);
      });

    const handleClickOutside = (event: MouseEvent) => {
      if (provRef.current && !provRef.current.contains(event.target as Node))
        setIsProvOpen(false);
      if (catRef.current && !catRef.current.contains(event.target as Node))
        setIsCatOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      isMounted = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeScope, activeProvincia, activeCategory]);

  const filteredRankings = rankings.filter((player) => {
    const nombre = player.perfiles?.nombre_completo?.toLowerCase() || "";
    const club = player.club_nombre?.toLowerCase() || "";
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

  const PROVINCIAS = [
    "Buenos Aires",
    "Córdoba",
    "Santa Fe",
    "Mendoza",
    "La Rioja",
  ];
  const CATEGORIAS = ["Todas", "1ª", "2ª", "3ª", "4ª", "5ª", "6ª"];

  return (
    <div className="min-h-screen bg-padel-1 text-white font-sans selection:bg-padel-4 selection:text-padel-1 pb-20">
      <main className="max-w-350 mx-auto px-10 pt-12">
        {/* ENCABEZADO Y CONTROLES */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
          <div>
            <h1 className="text-[40px] font-bold leading-tight tracking-tight">
              Ranking de jugadores
            </h1>
            {/* Subtítulo idéntico a la maqueta */}
            <p className="text-gray-400 mt-1">
              Temporada 2026 · Actualizado hace 2 horas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Input buscador reactivo */}
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-padel-5 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-padel-4/50"
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
            <div className="flex bg-padel-5 p-1 rounded-xl border border-white/5">
              {["Provincial", "Nacional", "Global"].map((scope) => (
                <button
                  key={scope}
                  onClick={() => {
                    if (activeScope !== scope) setLoading(true);
                    setActiveScope(scope);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeScope === scope
                      ? "bg-padel-4 text-padel-1 shadow-[0_0_10px_rgba(204,255,0,0.15)]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>

            {/* Dropdown Provincia */}
            {activeScope !== "Global" && (
              <div className="relative" ref={provRef}>
                <button
                  onClick={() => setIsProvOpen(!isProvOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-padel-5 text-xs font-bold hover:bg-white/5 transition-colors"
                >
                  <MapPin className="size-3.5 text-padel-4" /> {activeProvincia}{" "}
                  <ChevronDown className="size-3.5 text-gray-400" />
                </button>
                {isProvOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-padel-5 border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                    {PROVINCIAS.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          if (activeProvincia !== p) setLoading(true);
                          setActiveProvincia(p);
                          setIsProvOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-xs hover:bg-white/5 ${activeProvincia === p ? "text-padel-4 font-bold" : "text-gray-400"}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dropdown Categoría */}
            <div className="relative" ref={catRef}>
              <button
                onClick={() => setIsCatOpen(!isCatOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-padel-5 text-xs font-bold hover:bg-white/5 transition-colors"
              >
                <Trophy className="size-3.5 text-padel-4" />{" "}
                <span className="text-gray-400">Cat:</span> {activeCategory}{" "}
                <ChevronDown className="size-3.5 text-gray-400" />
              </button>
              {isCatOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-padel-5 border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                  {CATEGORIAS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        if (activeCategory !== c) setLoading(true);
                        setActiveCategory(c);
                        setIsCatOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-xs hover:bg-white/5 ${activeCategory === c ? "text-padel-4 font-bold" : "text-gray-400"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- RENDERIZADO CONDICIONAL --- */}
        {loading ? (
          /* SKELETON LOADER PREMIUM (Reemplaza el texto) */
          <div className="w-full animate-pulse">
            {/* Skeleton Podio */}
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
            {/* Skeleton Tabla */}
            <div className="bg-padel-5/50 rounded-3xlborder border-white/5 overflow-hidden h-75">
              <div className="w-full h-12 bg-white/5 border-b border-white/5"></div>
              <div className="w-full h-16 border-b border-white/5"></div>
              <div className="w-full h-16 border-b border-white/5"></div>
              <div className="w-full h-16 border-b border-white/5"></div>
            </div>
          </div>
        ) : sortedRankings.length === 0 ? (
          /* EMPTY STATE */
          <div className="w-full py-24 text-center border border-dashed border-white/10 rounded-3xl bg-padel-5/20 text-gray-500">
            No existen registros de ranking cargados para el filtro
            seleccionado.
          </div>
        ) : (
          /* CONTENIDO REAL */
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
              {/* PUESTO #2 */}
              <div className="bg-padel-5 border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center order-2 md:order-1 h-50 justify-center transition-all hover:border-white/10">
                <div className="w-12 h-12 bg-padel-1 border border-white/10 rounded-full flex items-center justify-center mb-3 text-gray-500">
                  <User className="size-5" />
                </div>
                <div className="text-xl font-black text-gray-400 mb-0.5">
                  #2
                </div>
                <div className="font-bold text-base text-white truncate w-full">
                  {top2 ? top2.perfiles?.nombre_completo : "A confirmar"}
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
                <div className="w-16 h-16 bg-padel-4/10 border border-padel-4/20 rounded-full flex items-center justify-center mb-3 text-padel-4">
                  <User className="size-6" />
                </div>
                <div className="text-3xl font-black text-padel-4 mb-0.5">
                  #1
                </div>
                <div className="font-bold text-lg text-white truncate w-full">
                  {top1 ? top1.perfiles?.nombre_completo : "A confirmar"}
                </div>
                <div className="text-padel-4 text-xs font-black tracking-wide mt-0.5">
                  {top1 ? `${top1.puntos.toLocaleString()} pts` : "-"}
                </div>
              </div>

              {/* PUESTO #3 */}
              <div className="bg-padel-5 border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center order-3 h-50 justify-center transition-all hover:border-white/10">
                <div className="w-12 h-12 bg-padel-1 border border-white/10 rounded-full flex items-center justify-center mb-3 text-gray-500">
                  <User className="size-5" />
                </div>
                <div className="text-xl font-black text-amber-700 mb-0.5">
                  #3
                </div>
                <div className="font-bold text-base text-white truncate w-full">
                  {top3 ? top3.perfiles?.nombre_completo : "A confirmar"}
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
                      <th className="py-4 px-6">Club</th>
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
                      const posicionReal = index + 4;

                      return (
                        <tr
                          key={player.id}
                          className="hover:bg-white/1 transition-colors group"
                        >
                          <td className="py-4 px-6 text-center font-bold text-sm text-gray-400">
                            {posicionReal}
                          </td>
                          <td className="py-4 px-6 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-padel-1 border border-white/10 flex items-center justify-center text-gray-500 group-hover:border-padel-4/30 transition-colors">
                              <User className="size-4" />
                            </div>
                            <span className="font-bold text-white group-hover:text-padel-4 transition-colors">
                              {player.perfiles?.nombre_completo ||
                                "Jugador sin nombre"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs font-semibold text-gray-300 uppercase">
                            {player.categoria}
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-400">
                            {player.club_nombre || "Sede General"}
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
                                  {player.tendencia}
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
