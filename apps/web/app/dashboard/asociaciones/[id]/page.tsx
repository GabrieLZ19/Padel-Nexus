"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Users,
  MapPin,
  Calendar,
  Building2,
  ChevronRight,
  ShieldCheck,
  Eye,
  Activity,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import { AsociacionesService, Asociacion } from "@/utils/services/asociaciones";
import CustomDropdown from "@/components/ui/CustomDropdown";

export default function DetalleAsociacionPage() {
  const params = useParams();
  const id = params?.id as string;

  const [asociacion, setAsociacion] = useState<Asociacion | null>(null);
  const [clubes, setClubes] = useState<any[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"clubes" | "torneos" | "jugadores">("clubes");

  // Filtros de Torneo
  const [selectedClubFilter, setSelectedClubFilter] = useState("Todos");
  const [torneosViewMode, setTorneosViewMode] = useState<"cards" | "tabla">("cards");

  // Modal Expediente del Jugador
  const [selectedJugador, setSelectedJugador] = useState<any | null>(null);
  const [showJugadorModal, setShowJugadorModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resAsoc, resClubes, resTorneos, resJugadores] = await Promise.all([
        AsociacionesService.getById(id),
        AsociacionesService.getClubes(id),
        AsociacionesService.getTorneos(id),
        AsociacionesService.getJugadores(id),
      ]);

      setAsociacion(resAsoc);
      setClubes(resClubes || []);
      setTorneos(resTorneos || []);
      setJugadores(resJugadores || []);
    } catch (err) {
      console.error("Error al cargar detalle de asociación:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenJugador = (j: any) => {
    setSelectedJugador(j);
    setShowJugadorModal(true);
  };

  const torneosFiltrados = torneos.filter((t) => {
    if (selectedClubFilter === "Todos") return true;
    return (
      t.club_id === selectedClubFilter ||
      t.club_nombre?.toLowerCase() === selectedClubFilter.toLowerCase() ||
      t.clubes?.nombre?.toLowerCase() === selectedClubFilter.toLowerCase()
    );
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 font-semibold max-w-7xl mx-auto">
        Cargando expediente de la asociación...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <Link
        href="/dashboard/asociaciones"
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand-chartreuse transition-colors"
      >
        <ArrowLeft className="size-4" /> Volver al Padrón de Asociaciones
      </Link>

      {/* Header Info */}
      <div className="bg-brand-card border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-brand-chartreuse/10 border border-brand-chartreuse/30 flex items-center justify-center text-brand-chartreuse font-black text-2xl shadow-lg shrink-0 overflow-hidden">
              {asociacion?.nombre ? (
                <span className="truncate px-1">{asociacion.nombre.slice(0, 2).toUpperCase()}</span>
              ) : (
                "AS"
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate">
                {asociacion?.nombre || "Asociación de Pádel"}
              </h1>
              <p className="text-gray-400 text-xs md:text-sm flex items-center gap-1.5 mt-1 truncate">
                <MapPin className="size-4 text-brand-chartreuse shrink-0" />
                {[asociacion?.direccion, asociacion?.localidad, asociacion?.provincia]
                  .filter(Boolean)
                  .join(", ") || "Sede registrada"}
              </p>
            </div>
          </div>

          <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="size-4" /> Entidad Afiliada FAP
          </span>
        </div>

        {/* Métricas Consolidadas Reales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/5">
          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
            <span className="text-xs text-gray-400 font-bold uppercase block mb-1">
              Clubes Afiliados
            </span>
            <span className="text-2xl font-black text-white">{clubes.length}</span>
          </div>
          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
            <span className="text-xs text-gray-400 font-bold uppercase block mb-1">
              Torneos Oficiales
            </span>
            <span className="text-2xl font-black text-white">{torneos.length}</span>
          </div>
          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
            <span className="text-xs text-gray-400 font-bold uppercase block mb-1">
              Jugadores Afiliados
            </span>
            <span className="text-2xl font-black text-brand-chartreuse">{jugadores.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 space-x-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab("clubes")}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === "clubes"
              ? "border-brand-chartreuse text-brand-chartreuse font-extrabold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Clubes Miembros ({clubes.length})
        </button>
        <button
          onClick={() => setActiveTab("torneos")}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === "torneos"
              ? "border-brand-chartreuse text-brand-chartreuse font-extrabold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Competencias & Torneos ({torneos.length})
        </button>
        <button
          onClick={() => setActiveTab("jugadores")}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === "jugadores"
              ? "border-brand-chartreuse text-brand-chartreuse font-extrabold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Padrón de Jugadores ({jugadores.length})
        </button>
      </div>

      {/* Contenido por Pestaña */}
      {activeTab === "clubes" ? (
        <div className="space-y-4">
          {clubes.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl text-gray-500">
              No hay clubes afiliados registrados bajo esta asociación.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubes.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#161616] border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl relative"
                >
                  <div className="flex justify-between items-start">
                    <div className="size-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-extrabold text-lg">
                      <Building2 className="size-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-gray-300">
                      Club Afiliado
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-white">{c.nombre}</h4>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                      <MapPin className="size-3.5 text-brand-chartreuse" />{" "}
                      {[c.direccion, c.localidad, c.provincia].filter(Boolean).join(", ") || "Dirección registrada"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs text-gray-400">
                    <div>
                      <span>Canchas:</span> <span className="text-white font-bold">{c.canchas || 4}</span>
                    </div>
                    <div>
                      <span>Estado:</span> <span className="text-emerald-400 font-bold">Activo</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "torneos" ? (
        <div className="space-y-6">
          {/* Barra de Filtros y Vista de Torneos */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-brand-card/50 p-4 rounded-2xl border border-white/5">
            <div className="w-full sm:w-72">
              <CustomDropdown
                value={selectedClubFilter}
                onChange={setSelectedClubFilter}
                options={[
                  { value: "Todos", label: "Todos los Clubes Sede" },
                  ...clubes.map((c) => ({ value: c.id, label: c.nombre })),
                ]}
                placeholder="Filtrar por Club Sede..."
              />
            </div>

            <div className="flex items-center bg-[#161616] p-1 rounded-xl border border-white/10 self-end sm:self-auto">
              <button
                onClick={() => setTorneosViewMode("cards")}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  torneosViewMode === "cards"
                    ? "bg-brand-chartreuse text-brand-black shadow font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Vista Cards"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setTorneosViewMode("tabla")}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  torneosViewMode === "tabla"
                    ? "bg-brand-chartreuse text-brand-black shadow font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Vista Lista"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          {torneosFiltrados.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl text-gray-500">
              No hay torneos registrados para el club seleccionado.
            </div>
          ) : torneosViewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {torneosFiltrados.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/torneos/${t.id}/espectador`}
                  className="bg-[#161616] border border-white/5 hover:border-brand-chartreuse/40 rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-brand-chartreuse uppercase tracking-wider">
                        {t.categoria || "Libres"}
                      </span>
                      <span
                        className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${
                          t.estado === "Inscripción"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : t.estado === "En curso"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-white/10 text-gray-300 border border-white/10"
                        }`}
                      >
                        {t.estado || "Borrador"}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-black text-white group-hover:text-brand-chartreuse transition-colors">
                        {t.nombre}
                      </h4>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-2">
                        <Building2 className="size-3.5 text-blue-400" /> Club Sede:{" "}
                        <span className="text-white font-bold">
                          {t.club_nombre || t.clubes?.nombre || clubes.find((c) => c.id === t.club_id)?.nombre || "Sede Oficial"}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                        <Calendar className="size-3.5 text-brand-chartreuse" /> Alcance:{" "}
                        <span className="text-gray-300 font-medium">{t.alcance || "Provincial"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex items-center justify-between mt-4">
                    <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors flex items-center gap-1">
                      Ver Llaves & Fixture <ChevronRight className="size-4 text-brand-chartreuse" />
                    </span>
                    <Eye className="size-4 text-gray-500 group-hover:text-brand-chartreuse transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-[#161616] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-black/30">
                    <th className="px-6 py-4">Torneo / Competencia</th>
                    <th className="px-6 py-4">Club Sede</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-semibold text-gray-300">
                  {torneosFiltrados.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{t.nombre}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {t.club_nombre || t.clubes?.nombre || clubes.find((c) => c.id === t.club_id)?.nombre || "Sede Oficial"}
                      </td>
                      <td className="px-6 py-4 text-brand-chartreuse font-extrabold text-xs">{t.categoria || "5ª"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-gray-300">
                          {t.estado || "Borrador"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/torneos/${t.id}/espectador`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse rounded-xl font-bold text-xs transition-colors"
                        >
                          <Eye className="size-3.5" /> Ver Fixture
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-brand-card border border-white/5 rounded-3xl overflow-hidden p-6 space-y-4">
          <h4 className="text-sm font-extrabold text-white">Padrón Oficial de Jugadores Afiliados</h4>
          {jugadores.length === 0 ? (
            <p className="text-xs text-gray-500">
              No se registran jugadores afiliados en esta entidad.
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {jugadores.map((j) => (
                <div
                  key={j.id}
                  onClick={() => handleOpenJugador(j)}
                  className="py-3.5 flex justify-between items-center text-xs text-gray-300 hover:bg-white/5 px-4 rounded-2xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center font-black text-brand-chartreuse text-sm overflow-hidden shrink-0">
                      {j.avatar_url ? (
                        <img src={j.avatar_url} alt={j.nombre} className="size-full object-cover" />
                      ) : (
                        <span>{j.nombre ? j.nombre[0].toUpperCase() : "J"}</span>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm group-hover:text-brand-chartreuse transition-colors block">
                        {j.nombre} {j.apellido}
                      </span>
                      <span className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>Categoría: <strong className="text-gray-200">{j.categoria || "5ª"}</strong></span>
                        <span>· Club: <strong className="text-gray-200">{j.club || "Afiliado"}</strong></span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono text-gray-400 font-semibold">
                      DNI: {j.dni || "N/D"}
                    </span>
                    <button
                      className="p-2 bg-white/5 group-hover:bg-brand-chartreuse group-hover:text-brand-black text-gray-300 rounded-xl transition-all"
                      title="Ver Expediente de Jugador"
                    >
                      <Eye className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Expediente de Jugador */}
      {showJugadorModal && selectedJugador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 w-full max-w-lg shadow-2xl relative space-y-6">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-2xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center text-brand-chartreuse font-black text-xl overflow-hidden shrink-0">
                  {selectedJugador.avatar_url ? (
                    <img src={selectedJugador.avatar_url} alt={selectedJugador.nombre} className="size-full object-cover" />
                  ) : (
                    <span>{selectedJugador.nombre ? selectedJugador.nombre[0].toUpperCase() : "J"}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black text-brand-chartreuse uppercase tracking-wider block mb-0.5">
                    Expediente Oficial de Jugador
                  </span>
                  <h3 className="text-xl font-extrabold text-white">
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
                <span className="text-white font-bold block">{selectedJugador.club || "Club Afiliado"}</span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">DNI</span>
                <span className="text-white font-mono font-bold block">{selectedJugador.dni || "N/D"}</span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">Categoría</span>
                <span className="text-brand-chartreuse font-extrabold block">{selectedJugador.categoria || "5ª Categoría"}</span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">Posición Ranking FAP</span>
                <span className="text-yellow-400 font-black text-xs block">
                  {selectedJugador.ranking && selectedJugador.ranking > 0
                    ? `#${selectedJugador.ranking} en el Ranking`
                    : "Sin Clasificación Oficial"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">Edad / Género</span>
                <span className="text-white font-bold block">
                  {selectedJugador.edad ? `${selectedJugador.edad} años` : "N/D"} • {selectedJugador.sexo === "femenino" ? "Femenino" : "Masculino"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">Provincia</span>
                <span className="text-gray-300 font-bold block">{selectedJugador.provincia || "Argentina"}</span>
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="size-4 text-brand-chartreuse" /> Rendimiento & Estadísticas
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">Puntos FAP</span>
                  <span className="text-sm font-black text-brand-chartreuse">{selectedJugador.puntos || 0} pts</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">Partidos Jugados</span>
                  <span className="text-sm font-black text-white">{selectedJugador.partidos_jugados || 0}</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">Efectividad</span>
                  <span className="text-sm font-black text-emerald-400">
                    {selectedJugador.partidos_jugados > 0
                      ? `${Math.round((selectedJugador.partidos_ganados / selectedJugador.partidos_jugados) * 100)}%`
                      : "0%"}
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
