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
import { TorneosService } from "../../../../utils/services/torneos";
import { Partido, Torneo } from "../../../../utils/types/index";
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
      <div className="min-h-screen bg-[#111111] text-white">
        <div className="max-w-350 mx-auto px-6 lg:px-10 py-8 animate-pulse">
          <div className="w-32 h-4 bg-white/5 rounded-md mb-8"></div>
          <div className="bg-[#161616] rounded-4xl p-8 lg:p-12 mb-8 h-80 lg:h-60"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 bg-[#161616] border border-white/5 rounded-3xl p-6 h-125"></div>
            <div className="space-y-6">
              <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 h-64"></div>
              <div className="bg-[#161616] border border-white/5 rounded-3xl p-8 h-48"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="min-h-[calc(100vh-88px)] flex flex-col items-center justify-center text-center px-4 bg-[#111111]">
        <Trophy className="size-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Torneo no encontrado
        </h2>
        <p className="text-gray-400 mb-6">
          El torneo que buscás no existe o fue eliminado.
        </p>
        <button
          onClick={() => router.push("/torneos")}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
        >
          Explorar torneos
        </button>
      </div>
    );
  }

  // --- VARIABLES DE ESTADO Y CUPOS ---
  const estadoBase = (torneo?.estado || "").toLowerCase().trim();
  const isEnCurso = estadoBase === "en curso";
  const isFinalizado = estadoBase === "finalizado";
  const isAbierto = estadoBase === "inscripción" || estadoBase === "borrador";
  const isIndividual = torneo.modalidad === "Individual";
  const hasPremios = torneo.premio_1 || torneo.premio_2 || torneo.premio_3;

  const cuposActuales = torneo.cupos_actuales || 0;
  const cuposMaximos = torneo.cupos_maximos || 16;
  const isLleno = cuposActuales >= cuposMaximos;

  // --- LÓGICA CONDICIONAL DE BOTONES UNIFICADA ---
  let btnText = "";
  let btnClass = "";
  let isDisabled = false;

  if (isAlreadyEnrolled) {
    btnText = "Ver mi inscripción";
    btnClass =
      "bg-white/10 text-white hover:bg-white/20 border border-white/20";
  } else if (!isAbierto) {
    // Si NO está abierto (En curso o Finalizado), anulamos "Cupos Agotados"
    btnText = "Inscripciones Cerradas";
    btnClass =
      "bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed opacity-80 shadow-none";
    isDisabled = true;
  } else if (isLleno) {
    btnText = "Cupos Agotados";
    btnClass =
      "bg-red-500/20 text-red-500 border border-red-500/20 cursor-not-allowed opacity-80 shadow-none";
    isDisabled = true;
  } else if (!profile) {
    btnText = "Ingresar para inscribirte";
    btnClass =
      "bg-padel-4 hover:bg-[#b3e600] text-[#111] shadow-[0_0_30px_rgba(204,255,0,0.2)]";
  } else {
    btnText = isIndividual ? "Inscribirme" : "Inscribir mi dupla";
    btnClass =
      "bg-padel-4 hover:bg-[#b3e600] text-[#111] shadow-[0_0_30px_rgba(204,255,0,0.2)]";
  }

  // --- LÓGICA DINÁMICA DEL CUADRO (SE ADAPTA A LOS CUPOS MÁXIMOS) ---
  const RONDAS_CONFIG = [
    { id: "16AVOS", label: "16avos", required: 16 },
    { id: "OCTAVOS", label: "Octavos", required: 8 },
    { id: "CUARTOS", label: "Cuartos", required: 4 },
    { id: "SEMIS", label: "Semis", required: 2 },
    { id: "FINAL", label: "Final", required: 1 },
  ];

  // Filtramos para dibujar solo las rondas matemáticas válidas para el torneo
  const rondasToShow = RONDAS_CONFIG.filter(
    (r) => r.required <= cuposMaximos / 2,
  );

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

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="max-w-350 mx-auto px-6 lg:px-10 py-8">
        <button
          onClick={() => router.push("/torneos")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold mb-8"
        >
          <ChevronLeft className="size-4" /> Volver a torneos
        </button>

        {/* ENCABEZADO DEL TORNEO */}
        <div className="bg-linear-to-r from-[#212b06] to-padel-1 rounded-3xl p-8 lg:p-12 mb-8 relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border border-white/5">
          <div className="absolute top-0 right-0 w-125 h-125 bg-padel-4/10 blur-[120px] rounded-full pointer-events-none transform translate-x-1/4 -translate-y-1/4"></div>
          <div className="relative z-10 space-y-5 flex-1">
            <div className="inline-flex items-center gap-2 bg-padel-4 text-[#111] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
              {torneo.nivel} {torneo.categoria} ·{" "}
              {isAbierto ? "Inscripción Abierta" : torneo.estado}
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight">
              {torneo.nombre}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-gray-300">
              <span className="flex items-center gap-2">
                <MapPin className="size-4 text-padel-4" />{" "}
                {torneo.clubes?.nombre || "Sede a confirmar"}
              </span>
              <span className="flex items-center gap-2 capitalize">
                <Calendar className="size-4 text-padel-4" />{" "}
                {formatFecha(torneo.fecha)}
              </span>
              <span
                className={`flex items-center gap-2 ${isAbierto && isLleno ? "text-red-400" : ""}`}
              >
                {isIndividual ? (
                  <User
                    className={`size-4 ${isAbierto && isLleno ? "text-red-400" : "text-padel-4"}`}
                  />
                ) : (
                  <Users
                    className={`size-4 ${isAbierto && isLleno ? "text-red-400" : "text-padel-4"}`}
                  />
                )}
                {cuposActuales}/{cuposMaximos}{" "}
                {isIndividual ? "jugadores" : "duplas"}
                {isAbierto && isLleno && " (Agotado)"}
              </span>
              {hasPremios && (
                <span className="flex items-center gap-2">
                  <Trophy className="size-4 text-padel-4" /> Premios en juego
                </span>
              )}
            </div>
          </div>

          {/* BOTÓN PRINCIPAL (HERO) */}
          <button
            onClick={handleInscripcion}
            disabled={inscribiendo || isDisabled}
            className={`relative z-10 shrink-0 w-full lg:w-auto px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${btnClass}`}
          >
            {btnText}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: CUADRO PRINCIPAL DINÁMICO */}
          <div className="lg:col-span-2 bg-[#161616] border border-white/5 rounded-3xl p-6 lg:p-10 overflow-x-auto shadow-xl">
            <div className="flex justify-between items-center mb-16 min-w-150">
              <h2 className="text-2xl font-bold text-white">
                Cuadro principal
              </h2>
              {isEnCurso && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  En vivo
                </div>
              )}
              {isFinalizado && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">
                  <CheckCircle2 className="size-3" /> Torneo Finalizado
                </div>
              )}
            </div>

            {/* GENERADOR DE COLUMNAS FLEXIBLE (Se adapta a 4, 8 o 16 cupos) */}
            <div className="flex gap-8 lg:gap-12 min-w-150 h-137.5 pb-4">
              {rondasToShow.map((rondaInfo) => {
                const roundMatches = getRoundMatches(
                  rondaInfo.id,
                  rondaInfo.required,
                );

                return (
                  <div
                    key={rondaInfo.id}
                    className="flex-1 flex flex-col relative h-full"
                  >
                    <h3 className="text-center text-xs font-black text-padel-4 uppercase tracking-widest mb-4 absolute -top-10 w-full">
                      {rondaInfo.label}
                    </h3>

                    {/* Justify-around reparte las tarjetas matemáticamente perfecto a lo alto */}
                    <div className="flex flex-col justify-around h-full w-full">
                      {roundMatches.map((p) => (
                        <div
                          key={p.id}
                          className="relative w-full flex items-center justify-center"
                        >
                          <MatchCard partido={p} />
                          {/* Dibuja la línea conectora hacia la derecha, excepto en la columna Final */}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMNA DERECHA: INSCRIPCIÓN Y PREMIOS */}
          <div className="space-y-6">
            <div className="bg-[#181d0a] border border-padel-4/30 rounded-3xl p-8 shadow-[0_0_40px_rgba(204,255,0,0.05)]">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Inscripción
              </div>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl font-black text-padel-4 tracking-tight">
                  $
                  {Number(torneo.precio_inscripcion || 0).toLocaleString(
                    "es-AR",
                  )}
                </span>
                <span className="text-gray-400 font-semibold mb-1">
                  / {isIndividual ? "jugador" : "dupla"}
                </span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                  {isIndividual ? (
                    <User className="size-5 text-padel-4 shrink-0" />
                  ) : (
                    <Users className="size-5 text-padel-4 shrink-0" />
                  )}
                  Inscripción {isIndividual ? "individual" : "por dupla"}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                  <ShieldCheck className="size-5 text-padel-4 shrink-0" />{" "}
                  Formato: {torneo.formato || "Eliminatoria"}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                  <CreditCard className="size-5 text-padel-4 shrink-0" /> Pago
                  total o 50% parcial
                </li>
              </ul>

              {/* LÓGICA CONDICIONAL DE LA SIDEBAR (AHORA USA LAS MISMAS VARIABLES DEL HERO) */}
              {isAbierto ? (
                <button
                  onClick={handleInscripcion}
                  disabled={inscribiendo || isDisabled}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center ${btnClass}`}
                >
                  {btnText}
                </button>
              ) : (
                <div className="w-full bg-white/5 border border-white/10 text-gray-500 py-4 rounded-xl font-bold text-center cursor-not-allowed flex flex-col items-center justify-center">
                  <span className="text-white">Inscripciones Cerradas</span>
                  <span className="text-xs font-normal mt-1">
                    El torneo se encuentra {torneo.estado?.toLowerCase()}.
                  </span>
                </div>
              )}
            </div>

            {hasPremios && (
              <div className="bg-[#161616] border border-white/5 rounded-3xl p-8">
                <h3 className="text-lg font-bold text-white mb-6">Premios</h3>
                <div className="space-y-5">
                  {torneo.premio_1 && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black text-sm border border-yellow-500/20 shrink-0">
                        1º
                      </div>
                      <div className="font-semibold text-gray-300 text-sm">
                        {torneo.premio_1}
                      </div>
                    </div>
                  )}
                  {torneo.premio_2 && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-gray-400/10 text-gray-400 flex items-center justify-center font-black text-sm border border-gray-400/20 shrink-0">
                        2º
                      </div>
                      <div className="font-semibold text-gray-300 text-sm">
                        {torneo.premio_2}
                      </div>
                    </div>
                  )}
                  {torneo.premio_3 && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-amber-700/10 text-amber-600 flex items-center justify-center font-black text-sm border border-amber-700/20 shrink-0">
                        3º
                      </div>
                      <div className="font-semibold text-gray-300 text-sm">
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
