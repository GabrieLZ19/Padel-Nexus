"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Users,
  User,
  Trophy,
  ShieldCheck,
  CreditCard,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { Partido, Torneo } from "@/utils/types/index";
import InscripcionModal from "@/components/torneos/InscripcionModal";
import { useProfileStore } from "@/store/useProfileStore";
import { MatchCard } from "@/components/torneos/MatchCard";

export default function TorneoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const torneoId = params.id as string;

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [inscribiendo, setInscribiendo] = useState<boolean>(false);
  const [isInscripcionOpen, setIsInscripcionModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const { profile } = useProfileStore();

  const isAlreadyEnrolled =
    profile &&
    torneo?.inscripciones?.some((ins) => ins.usuario_id === profile.id);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      TorneosService.getById(torneoId),
      TorneosService.getPartidos(torneoId),
    ])
      .then(([torneoData, partidosData]) => {
        if (isMounted) {
          setTorneo(torneoData);
          setPartidos(partidosData || []);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error al cargar la data:", error);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [torneoId, refreshKey]);

  const formatFecha = (fechaVal?: string | number | null) => {
    if (!fechaVal) return "Fecha a confirmar";
    const date = new Date(String(fechaVal));
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const handleInscripcion = () => {
    if (!profile) {
      router.push("/login");
      return;
    }
    if (isAlreadyEnrolled) {
      router.push("/mis-inscripciones");
      return;
    }
    setIsInscripcionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black text-brand-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 animate-pulse">
          <div className="w-32 h-4 bg-brand-white/5 rounded-md mb-8"></div>
          <div className="bg-brand-card rounded-3xl p-8 lg:p-12 mb-8 h-80 lg:h-60"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 bg-brand-card border border-brand-white/5 rounded-3xl p-6 h-150"></div>
            <div className="space-y-6">
              <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-8 h-64"></div>
              <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-8 h-48"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="min-h-[calc(100vh-88px)] flex flex-col items-center justify-center text-center px-4 bg-brand-black">
        <Trophy className="size-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-brand-white mb-2">
          Torneo no encontrado
        </h2>
        <p className="text-gray-400 mb-6">
          El torneo que buscás no existe o fue eliminado.
        </p>
        <button
          onClick={() => router.push("/torneos")}
          className="bg-brand-white/10 hover:bg-brand-white/20 text-brand-white px-6 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer"
        >
          Explorar torneos
        </button>
      </div>
    );
  }

  const estadoBase = (torneo?.estado || "").toLowerCase().trim();
  const isEnCurso = estadoBase === "en curso";
  const isFinalizado = estadoBase === "finalizado";
  const isAbierto = estadoBase === "inscripción" || estadoBase === "borrador";
  const isIndividual = torneo.modalidad === "Individual";
  const hasPremios = torneo.premio_1 || torneo.premio_2 || torneo.premio_3;

  const cuposActuales = torneo.cupos_actuales || 0;
  const cuposMaximos = torneo.cupos_maximos || 16;
  const isLleno = cuposActuales >= cuposMaximos;

  let btnText = "";
  let btnClass = "";
  let isDisabled = false;

  if (isAlreadyEnrolled) {
    btnText = "Ver mi inscripción";
    btnClass =
      "bg-brand-white/10 text-brand-white hover:bg-brand-white/20 border border-brand-white/20";
  } else if (!isAbierto) {
    btnText = "Inscripciones Cerradas";
    btnClass =
      "bg-brand-white/5 text-gray-500 border border-brand-white/10 cursor-not-allowed opacity-80 shadow-none";
    isDisabled = true;
  } else if (isLleno) {
    btnText = "Cupos Agotados";
    btnClass =
      "bg-red-500/20 text-red-500 border border-red-500/20 cursor-not-allowed opacity-80 shadow-none";
    isDisabled = true;
  } else if (!profile) {
    btnText = "Ingresar para inscribirte";
    btnClass =
      "bg-brand-chartreach text-brand-black hover:opacity-95 shadow-[0_0_30px_rgba(203,254,1,0.15)]";
  } else {
    btnText = isIndividual ? "Inscribirme" : "Inscribir mi dupla";
    btnClass =
      "bg-brand-chartreuse text-brand-black hover:opacity-95 shadow-[0_0_30px_rgba(203,254,1,0.15)]";
  }

  const RONDAS_CONFIG = [
    { id: "16AVOS", label: "16avos", required: 16 },
    { id: "OCTAVOS", label: "Octavos", required: 8 },
    { id: "CUARTOS", label: "Cuartos", required: 4 },
    { id: "SEMIS", label: "Semis", required: 2 },
    { id: "FINAL", label: "Final", required: 1 },
  ];

  const activeRounds = new Set(
    (partidos || []).map((p) => p.ronda.toUpperCase()),
  );
  const rondasToShow = RONDAS_CONFIG.filter((r) => activeRounds.has(r.id));

  const getRoundMatches = (round: string, requiredCount: number): Partido[] => {
    const found = partidos
      .filter((p) => p.ronda === round)
      .sort((a, b) => a.orden - b.orden);
    const result: Partido[] = [];

    for (let i = 0; i < requiredCount; i++) {
      if (found[i]) {
        result.push(found[i]);
      } else {
        result.push({
          id: `empty-${round}-${i}`,
          torneo_id: torneoId,
          ronda: round,
          orden: i + 1,
          equipo_a_j1: null,
          equipo_a_j2: null,
          equipo_b_j1: null,
          equipo_b_j2: null,
          set1_a: null,
          set1_b: null,
          ganador: null,
        });
      }
    }
    return result;
  };

  const maxMatches = rondasToShow.reduce((max, rondaInfo) => {
    const count = getRoundMatches(rondaInfo.id, rondaInfo.required).length;
    return count > max ? count : max;
  }, 1);

  const dynamicHeight = Math.max(580, maxMatches * 115);

  return (
    <div className="min-h-screen bg-brand-black text-brand-white font-sans selection:bg-brand-chartreuse selection:text-brand-black">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-6 lg:py-8 animate-in fade-in duration-300">
        <button
          onClick={() => router.push("/torneos")}
          className="flex items-center gap-2 text-gray-400 hover:text-brand-white transition-colors text-sm font-semibold mb-6 lg:mb-8 cursor-pointer"
        >
          <ChevronLeft className="size-4" /> Volver a torneos
        </button>

        {/* ENCABEZADO DEL TORNEO */}
        <div className="bg-linear-to-r from-brand-chartreuse/10 to-brand-card rounded-3xl p-6 lg:p-12 mb-8 relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border border-brand-white/5 shadow-xl">
          <div className="absolute top-0 right-0 w-125 h-125 bg-brand-chartreuse/5 blur-[120px] rounded-full pointer-events-none transform translate-x-1/4 -translate-y-1/4"></div>

          <div className="relative z-10 space-y-4 lg:space-y-5 flex-1">
            <div className="inline-flex items-center gap-2 bg-brand-chartreuse text-brand-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
              {torneo.nivel} {torneo.categoria} ·{" "}
              {isAbierto ? "Inscripción Abierta" : torneo.estado}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-brand-white tracking-tight">
              {torneo.nombre}
            </h1>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-6 gap-y-3 text-sm font-medium text-gray-300">
              <span className="flex items-center gap-2">
                <MapPin className="size-4 text-brand-chartreuse" />{" "}
                {torneo.clubes?.nombre || "Sede a confirmar"}
              </span>
              <span className="flex items-center gap-2 capitalize">
                <Calendar className="size-4 text-brand-chartreuse" />{" "}
                {formatFecha(torneo.fecha)}
              </span>
              <span
                className={`flex items-center gap-2 ${isAbierto && isLleno ? "text-red-400" : ""}`}
              >
                {isIndividual ? (
                  <User
                    className={`size-4 ${isAbierto && isLleno ? "text-red-400" : "text-brand-chartreuse"}`}
                  />
                ) : (
                  <Users
                    className={`size-4 ${isAbierto && isLleno ? "text-red-400" : "text-brand-chartreuse"}`}
                  />
                )}
                {cuposActuales}/{cuposMaximos}{" "}
                {isIndividual ? "jugadores" : "duplas"}
                {isAbierto && isLleno && " (Agotado)"}
              </span>
              {hasPremios && (
                <span className="flex items-center gap-2">
                  <Trophy className="size-4 text-brand-chartreuse" /> Premios en
                  juego
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleInscripcion}
            disabled={inscribiendo || isDisabled}
            className={`relative z-10 shrink-0 w-full lg:w-auto px-8 py-4 rounded-xl font-bold text-base lg:text-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${btnClass}`}
          >
            {btnText}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* COLUMNA IZQUIERDA: CUADRO PRINCIPAL O LISTA DE INSCRIPTOS */}
          <div className="lg:col-span-2">
            {isAbierto ? (
              <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-5 lg:p-10 shadow-xl flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-brand-white flex items-center gap-3">
                      <Users className="size-6 text-brand-chartreuse" />
                      Inscriptos
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                      Lista de participantes registrados en el torneo.
                    </p>
                  </div>
                  <span className="bg-brand-chartreuse/10 text-brand-chartreuse px-4 py-1.5 rounded-full text-sm font-bold border border-brand-chartreuse/20">
                    {cuposActuales} / {cuposMaximos}{" "}
                    {isIndividual ? "Jugadores" : "Duplas"}
                  </span>
                </div>

                {/* Visualización de Cupos (Ocupados / Disponibles) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Array.from({ length: cuposMaximos }).map((_, index) => {
                    const isOcupado = index < cuposActuales;
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 ${
                          isOcupado
                            ? "bg-brand-white/2 border-brand-white/5 opacity-60 font-medium"
                            : "bg-brand-chartreuse/5 border-brand-chartreuse/10 hover:border-brand-chartreuse/35"
                        }`}
                      >
                        <div
                          className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            isOcupado
                              ? "bg-brand-white/5 text-gray-400"
                              : "bg-brand-chartreuse/15 text-brand-chartreuse shadow-[0_0_15px_rgba(203,254,1,0.1)]"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isOcupado
                              ? "text-gray-500"
                              : "text-brand-chartreuse"
                          }`}
                        >
                          {isOcupado
                            ? isIndividual
                              ? "Ocupado"
                              : "Dupla Inscripta"
                            : "Disponible"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Sección informativa adicional */}
                <div className="mt-8 pt-8 border-t border-brand-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-white/1 border border-brand-white/5 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-brand-chartreuse uppercase tracking-widest mb-3">
                      Reglamento y Formato
                    </h4>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Este torneo se juega bajo la modalidad{" "}
                      <span className="text-brand-white font-semibold">
                        {torneo.modalidad}
                      </span>{" "}
                      con formato de{" "}
                      <span className="text-brand-white font-semibold">
                        {torneo.formato || "Eliminatoria Directa"}
                      </span>
                      . Las reglas oficiales de la federación aplican para todas
                      las categorías.
                    </p>
                  </div>
                  <div className="bg-brand-white/1 border border-brand-white/5 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-brand-chartreuse uppercase tracking-widest mb-3">
                      Sede y Canchas
                    </h4>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Los encuentros se disputarán en{" "}
                      <span className="text-brand-white font-semibold">
                        {torneo.clubes?.nombre ||
                          torneo.lugar ||
                          "Sede central"}
                      </span>
                      . El complejo cuenta con canchas profesionales.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-5 lg:p-10 shadow-xl flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 lg:mb-12">
                  <h2 className="text-xl md:text-2xl font-bold text-brand-white">
                    Cuadro principal
                  </h2>
                  <div className="flex gap-2">
                    {isEnCurso && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-full uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        En vivo
                      </div>
                    )}
                    {isFinalizado && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">
                        <CheckCircle2 className="size-3" /> Finalizado
                      </div>
                    )}
                  </div>
                </div>

                {/* CONTENEDOR SCROLLABLE UNIVERSAL */}
                <div className="w-full overflow-x-auto pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                  <div
                    className="flex gap-6 lg:gap-8 w-max min-w-full px-2 lg:px-0"
                    style={{ height: `${dynamicHeight}px` }}
                  >
                    {rondasToShow.map((rondaInfo) => {
                      const roundMatches = getRoundMatches(
                        rondaInfo.id,
                        rondaInfo.required,
                      );

                      return (
                        <div
                          key={rondaInfo.id}
                          className="min-w-50 lg:min-w-60 flex-1 flex flex-col relative h-full"
                        >
                          <h3 className="text-center text-[11px] lg:text-xs font-black text-brand-chartreuse uppercase tracking-widest mb-4 absolute -top-8 lg:-top-10 w-full">
                            {rondaInfo.label}
                          </h3>

                          <div className="flex flex-col justify-around h-full w-full">
                            {roundMatches.map((p) => (
                              <div
                                key={p.id}
                                className="relative w-full flex items-center justify-center"
                              >
                                <MatchCard partido={p} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-center text-xs text-gray-500 mt-2 flex items-center justify-center gap-2 opacity-70">
                  ↔ Deslizá para ver todas las rondas
                </p>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: INSCRIPCIÓN Y PREMIOS */}
          <div className="space-y-6">
            <div className="bg-brand-card border border-brand-chartreuse/10 rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-brand-chartreuse/10 to-transparent" />
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Inscripción
              </div>
              <div className="flex items-end gap-2 mb-6">
                {Number(torneo.precio_inscripcion || 0) === 0 ? (
                  <span className="text-4xl lg:text-5xl font-black text-brand-chartreuse tracking-tight">
                    Gratis
                  </span>
                ) : (
                  <>
                    <span className="text-4xl lg:text-5xl font-black text-brand-chartreuse tracking-tight">
                      $
                      {Number(torneo.precio_inscripcion || 0).toLocaleString(
                        "es-AR",
                      )}
                    </span>
                    <span className="text-gray-400 font-semibold mb-1 text-sm lg:text-base">
                      / {isIndividual ? "jugador" : "dupla"}
                    </span>
                  </>
                )}
              </div>
              <ul className="space-y-3 lg:space-y-4 mb-8">
                <li className="flex items-center gap-3 text-xs lg:text-sm font-medium text-gray-300">
                  {isIndividual ? (
                    <User className="size-4 lg:size-5 text-brand-chartreuse shrink-0" />
                  ) : (
                    <Users className="size-4 lg:size-5 text-brand-chartreuse shrink-0" />
                  )}
                  Inscripción {isIndividual ? "individual" : "por dupla"}
                </li>
                <li className="flex items-center gap-3 text-xs lg:text-sm font-medium text-gray-300">
                  <ShieldCheck className="size-4 lg:size-5 text-brand-chartreuse shrink-0" />{" "}
                  Formato: {torneo.formato || "Eliminatoria"}
                </li>
                <li className="flex items-center gap-3 text-xs lg:text-sm font-medium text-gray-300">
                  <CreditCard className="size-4 lg:size-5 text-brand-chartreuse shrink-0" />{" "}
                  Pago total o 50% parcial
                </li>
              </ul>

              {isAbierto ? (
                <button
                  onClick={handleInscripcion}
                  disabled={inscribiendo || isDisabled}
                  className={`w-full py-3.5 lg:py-4 rounded-xl font-bold text-base lg:text-lg transition-all flex items-center justify-center cursor-pointer active:scale-[0.99] ${btnClass}`}
                >
                  {btnText}
                </button>
              ) : (
                <div className="w-full bg-brand-white/5 border border-brand-white/10 text-gray-500 py-3.5 lg:py-4 rounded-xl font-bold text-center cursor-not-allowed flex flex-col items-center justify-center select-none">
                  <span className="text-brand-white text-sm lg:text-base">
                    Inscripciones Cerradas
                  </span>
                  <span className="text-[10px] lg:text-xs font-normal mt-1">
                    El torneo se encuentra {torneo.estado?.toLowerCase()}.
                  </span>
                </div>
              )}
            </div>

            {hasPremios && (
              <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 lg:p-8 shadow-xl">
                <h3 className="text-base lg:text-lg font-bold text-brand-white mb-5 lg:mb-6">
                  Premios
                </h3>
                <div className="space-y-4 lg:space-y-5">
                  {torneo.premio_1 && (
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-xs lg:text-sm border border-amber-500/20 shrink-0">
                        1º
                      </div>
                      <div className="font-semibold text-gray-300 text-xs lg:text-sm">
                        {torneo.premio_1}
                      </div>
                    </div>
                  )}
                  {torneo.premio_2 && (
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-slate-400/10 text-slate-400 flex items-center justify-center font-black text-xs lg:text-sm border border-slate-400/20 shrink-0">
                        2º
                      </div>
                      <div className="font-semibold text-gray-300 text-xs lg:text-sm">
                        {torneo.premio_2}
                      </div>
                    </div>
                  )}
                  {torneo.premio_3 && (
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-amber-700/10 text-amber-600 flex items-center justify-center font-black text-xs lg:text-sm border border-amber-700/20 shrink-0">
                        3º
                      </div>
                      <div className="font-semibold text-gray-300 text-xs lg:text-sm">
                        {torneo.premio_3}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {torneo && (
        <InscripcionModal
          isOpen={isInscripcionOpen}
          onClose={() => {
            setIsInscripcionModalOpen(false);
            router.refresh();
            setRefreshKey((prev) => prev + 1);
          }}
          torneo={torneo}
        />
      )}
    </div>
  );
}
