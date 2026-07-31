"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Search, Eye, Activity, X, Building2, MapPin } from "lucide-react";
import { RankingsService, JugadorRanking } from "@/utils/services/rankings";
import CustomDropdown from "@/components/ui/CustomDropdown";

export default function RankingsPage() {
  const [rankings, setRankings] = useState<JugadorRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [rama, setRama] = useState("Todas");

  // Modal Expediente del Jugador
  const [selectedJugador, setSelectedJugador] = useState<any | null>(null);
  const [showJugadorModal, setShowJugadorModal] = useState(false);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const data = await RankingsService.getAll();
      setRankings(data);
    } catch (err) {
      console.error("Error al cargar rankings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenJugador = (j: any, posIndex: number) => {
    const pj = j.pj || j.partidos_jugados || 0;
    const pg = j.pg || j.partidos_ganados || 0;
    const efectividad = pj > 0 ? Math.round((pg / pj) * 100) : 0;

    setSelectedJugador({
      ...j,
      posicionRanking: posIndex + 1,
      pj,
      pg,
      efectividad,
    });
    setShowJugadorModal(true);
  };

  const filteredRankings = rankings.filter((j) => {
    const nombreCompleto = `${j.nombre || ""} ${j.apellido || ""}`.toLowerCase();
    const matchSearch = nombreCompleto.includes(search.toLowerCase().trim());
    const matchCat =
      categoria === "Todas" || (j.categoria_padel || j.categoria) === categoria;
    const matchRama =
      rama === "Todas" ||
      (j.sexo && j.sexo.toLowerCase() === rama.toLowerCase());
    return matchSearch && matchCat && matchRama;
  });

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase tracking-widest mb-1">
          <Trophy className="size-4" /> Circuito Nacional FAP
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Tabla General de Rankings
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Posiciones oficiales, rendimiento y expedientes completos por categoría y rama.
        </p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 size-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por Nombre o Apellido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-card border border-white/10 text-white pl-11 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-chartreuse/50"
          />
        </div>

        <CustomDropdown
          value={categoria}
          onChange={setCategoria}
          options={(() => {
            const baseCats = [
              "Todas",
              "1ª",
              "2ª",
              "3ª",
              "4ª",
              "5ª",
              "6ª",
              "7ª",
              "8ª",
              "Sub-12",
              "Sub-14",
              "Sub-16",
              "Sub-18",
              "+30",
              "+40",
              "+50",
            ];
            const bdCats = Array.from(
              new Set(
                rankings
                  .map((r) => r.categoria_padel || r.categoria)
                  .filter(Boolean),
              ),
            );
            const allCats = Array.from(new Set([...baseCats, ...bdCats]));
            return allCats.map((c) => ({
              value: c,
              label: c === "Todas" ? "Todas las Categorías" : `Categoría ${c}`,
            }));
          })()}
          placeholder="Categoría..."
        />

        <CustomDropdown
          value={rama}
          onChange={setRama}
          options={[
            { value: "Todas", label: "Todas las Ramas" },
            { value: "masculino", label: "Masculino" },
            { value: "femenino", label: "Femenino" },
          ]}
          placeholder="Rama..."
        />
      </div>

      {/* Tabla de Rankings */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-semibold">
          Cargando tabla de posiciones...
        </div>
      ) : filteredRankings.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl text-gray-500">
          No hay jugadores registrados que coincidan con los filtros.
        </div>
      ) : (
        <div className="bg-[#161616] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-black/30">
                  <th className="px-6 py-4 text-center">Pos.</th>
                  <th className="px-6 py-4">Jugador</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Provincia</th>
                  <th className="px-6 py-4 text-center">Partidos</th>
                  <th className="px-6 py-4 text-center">Efectividad</th>
                  <th className="px-6 py-4 text-right">Puntos FAP</th>
                  <th className="px-6 py-4 text-right">Expediente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-semibold text-gray-300">
                {filteredRankings.map((j, idx) => {
                  const pj = j.pj || (j as any).partidos_jugados || 0;
                  const pg = j.pg || (j as any).partidos_ganados || 0;
                  const efectividad = pj > 0 ? Math.round((pg / pj) * 100) : 0;
                  const avatarUrl = (j as any).avatar_url || (j as any).perfiles?.avatar_url;

                  return (
                    <tr
                      key={j.id || idx}
                      onClick={() => handleOpenJugador(j, idx)}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${
                            idx === 0
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : idx === 1
                                ? "bg-gray-300/20 text-gray-200 border border-gray-300/30"
                                : idx === 2
                                  ? "bg-amber-700/20 text-amber-500 border border-amber-700/30"
                                  : "bg-white/5 text-gray-400"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={`${j.nombre} ${j.apellido}`}
                              className="size-9 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="size-9 rounded-full bg-brand-chartreuse/20 border border-brand-chartreuse/30 flex items-center justify-center font-bold text-brand-chartreuse text-xs">
                              {(j.nombre?.[0] || "J").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-white block">
                              {j.nombre} {j.apellido}
                            </span>
                            <span className="text-[11px] text-gray-500 font-normal">
                              DNI: {(j as any).dni || (j as any).perfiles?.dni || "N/D"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 font-bold">
                          {j.categoria_padel || j.categoria || "5ª"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {j.provincia || "Argentina"}
                      </td>
                      <td className="px-6 py-4 text-center text-xs">
                        <span className="text-white font-bold">{pj}</span>
                        <span className="text-gray-500 text-[10px] block font-normal">
                          {pg} victorias
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs">
                        <span
                          className={`font-black ${
                            efectividad >= 70
                              ? "text-emerald-400"
                              : efectividad >= 40
                                ? "text-yellow-400"
                                : "text-gray-400"
                          }`}
                        >
                          {efectividad}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-brand-chartreuse text-base">
                        {j.puntos || (j as any).ranking_nacional || 0} pts
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenJugador(j, idx);
                          }}
                          className="p-2 bg-white/5 hover:bg-brand-chartreuse/20 text-gray-400 hover:text-brand-chartreuse rounded-xl transition-all inline-flex items-center gap-1 text-xs font-bold"
                          title="Ver Expediente Completo"
                        >
                          <Eye className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Expediente del Jugador */}
      {showJugadorModal && selectedJugador && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {selectedJugador.avatar_url || selectedJugador.perfiles?.avatar_url ? (
                  <img
                    src={selectedJugador.avatar_url || selectedJugador.perfiles?.avatar_url}
                    alt={selectedJugador.nombre}
                    className="size-14 rounded-2xl object-cover border-2 border-brand-chartreuse/40"
                  />
                ) : (
                  <div className="size-14 rounded-2xl bg-brand-chartreuse/20 border border-brand-chartreuse/40 flex items-center justify-center font-black text-brand-chartreuse text-xl">
                    {(selectedJugador.nombre?.[0] || "J").toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-chartreuse block">
                    Expediente Oficial de Jugador
                  </span>
                  <h3 className="text-xl font-black text-white">
                    {selectedJugador.nombre} {selectedJugador.apellido}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowJugadorModal(false)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">Club de Pertenencia</span>
                <span className="text-white font-bold block">
                  {selectedJugador.club || selectedJugador.perfiles?.clubes?.nombre || "Club Afiliado"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">DNI</span>
                <span className="text-white font-mono font-bold block">
                  {selectedJugador.dni || selectedJugador.perfiles?.dni || "N/D"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">Categoría</span>
                <span className="text-brand-chartreuse font-extrabold block">
                  {selectedJugador.categoria_padel || selectedJugador.categoria || "5ª Categoría"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">Posición Ranking FAP</span>
                <span className="text-yellow-400 font-black text-xs block">
                  #{selectedJugador.posicionRanking} en el Ranking
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">Edad / Género</span>
                <span className="text-white font-bold block">
                  {selectedJugador.edad || (selectedJugador.perfiles?.fecha_nacimiento ? `${new Date().getFullYear() - new Date(selectedJugador.perfiles.fecha_nacimiento).getFullYear()} años` : "30 años")} • {selectedJugador.sexo === "femenino" || selectedJugador.perfiles?.sexo === "femenino" ? "Femenino" : "Masculino"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">Provincia</span>
                <span className="text-gray-300 font-bold block">
                  {selectedJugador.provincia || selectedJugador.perfiles?.lugar_residencia || "Argentina"}
                </span>
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="size-4 text-brand-chartreuse" /> Rendimiento & Estadísticas
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">Puntos FAP</span>
                  <span className="text-sm font-black text-brand-chartreuse">
                    {selectedJugador.puntos || 0} pts
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">Partidos Jugados</span>
                  <span className="text-sm font-black text-white">{selectedJugador.pj}</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">Efectividad</span>
                  <span className="text-sm font-black text-emerald-400">
                    {selectedJugador.efectividad}%
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowJugadorModal(false)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cerrar Ficha del Jugador
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

