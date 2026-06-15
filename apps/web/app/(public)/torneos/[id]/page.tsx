"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Users,
  User,
  Trophy,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  ChevronLeft,
} from "lucide-react";
import { TorneosService } from "../../../../utils/services/torneos";
import { Partido, Torneo } from "../../../../utils/types/index";

const MatchCard = ({ partido }: { partido: Partido }) => {
  const isA = partido.ganador === "A";
  const isB = partido.ganador === "B";

  const renderEquipo = (j1: string | null, j2: string | null) => {
    if (!j1) return "-";
    if (!j2 || j2 === "-") return j1;
    return `${j1}/${j2}`;
  };

  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden flex flex-col w-full text-sm shadow-md">
      <div
        className={`flex justify-between items-center p-2.5 border-b border-white/5`}
      >
        <span
          className={`font-semibold truncate pr-2 ${isA ? "text-white" : "text-gray-400"}`}
        >
          {renderEquipo(partido.equipo_a_j1, partido.equipo_a_j2)}
        </span>
        <span
          className={`w-6 h-6 shrink-0 flex items-center justify-center rounded text-xs font-black ${isA ? "bg-padel-4 text-black" : "bg-[#252525] text-gray-500"}`}
        >
          {partido.set1_a ?? "-"}
        </span>
      </div>
      <div className={`flex justify-between items-center p-2.5`}>
        <span
          className={`font-semibold truncate pr-2 ${isB ? "text-white" : "text-gray-400"}`}
        >
          {renderEquipo(partido.equipo_b_j1, partido.equipo_b_j2)}
        </span>
        <span
          className={`w-6 h-6 shrink-0 flex items-center justify-center rounded text-xs font-black ${isB ? "bg-padel-4 text-black" : "bg-[#252525] text-gray-500"}`}
        >
          {partido.set1_b ?? "-"}
        </span>
      </div>
    </div>
  );
};

export default function TorneoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const torneoId = params.id as string;

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [inscribiendo, setInscribiendo] = useState<boolean>(false);

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
  }, [torneoId]);

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
    setInscribiendo(true);
    setTimeout(() => {
      alert("Flujo de pago e inscripción en construcción (Fase 2)");
      setInscribiendo(false);
    }, 1000);
  };

  // --- ESTADOS DE CARGA (SKELETON PREMIUM) ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] text-white">
        <div className="max-w-350 mx-auto px-6 lg:px-10 py-8 animate-pulse">
          {/* Back button skeleton */}
          <div className="w-32 h-4 bg-white/5 rounded-md mb-8"></div>

          {/* HERO SKELETON */}
          <div className="bg-[#161616] rounded-4xl p-8 lg:p-12 mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 border border-white/5 h-80 lg:h-60">
            <div className="space-y-6 flex-1 w-full">
              <div className="w-48 h-6 bg-white/10 rounded-full"></div>
              <div className="w-3/4 lg:w-1/2 h-12 lg:h-14 bg-white/10 rounded-xl"></div>
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="w-32 h-4 bg-white/10 rounded-md"></div>
                <div className="w-32 h-4 bg-white/10 rounded-md"></div>
                <div className="w-32 h-4 bg-white/10 rounded-md"></div>
              </div>
            </div>
            <div className="w-full lg:w-56 h-14 bg-white/10 rounded-xl shrink-0"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* BRACKET SKELETON */}
            <div className="lg:col-span-2 bg-[#161616] border border-white/5 rounded-3xl p-6 lg:p-8 overflow-hidden">
              <div className="w-48 h-8 bg-white/10 rounded-lg mb-10"></div>

              <div className="flex gap-8 lg:gap-12 pb-4 opacity-50">
                {/* Cuartos */}
                <div className="flex-1 flex flex-col gap-6">
                  <div className="w-16 h-3 bg-white/10 rounded mx-auto mb-4"></div>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-white/10 rounded-xl w-full"
                    ></div>
                  ))}
                </div>
                {/* Semis */}
                <div className="flex-1 flex flex-col justify-around gap-16 relative">
                  <div className="w-16 h-3 bg-white/10 rounded mx-auto mb-4 absolute top-0 left-1/2 -translate-x-1/2"></div>
                  <div className="mt-12 space-y-24">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-20 bg-white/10 rounded-xl w-full"
                      ></div>
                    ))}
                  </div>
                </div>
                {/* Final */}
                <div className="flex-1 flex flex-col justify-center relative">
                  <div className="w-16 h-3 bg-white/10 rounded mx-auto mb-4 absolute top-0 left-1/2 -translate-x-1/2"></div>
                  <div className="h-20 bg-white/10 rounded-xl w-full"></div>
                </div>
              </div>
            </div>

            {/* SIDEBAR SKELETON */}
            <div className="space-y-6">
              {/* Inscription Card Skeleton */}
              <div className="bg-[#161616] border border-white/5 rounded-3xl p-8">
                <div className="w-24 h-3 bg-white/10 rounded-md mb-6"></div>
                <div className="w-48 h-12 bg-white/10 rounded-lg mb-8"></div>
                <div className="space-y-4 mb-8">
                  <div className="w-full h-4 bg-white/10 rounded-md"></div>
                  <div className="w-5/6 h-4 bg-white/10 rounded-md"></div>
                  <div className="w-4/5 h-4 bg-white/10 rounded-md"></div>
                </div>
                <div className="w-full h-14 bg-white/10 rounded-xl"></div>
              </div>

              {/* Prizes Card Skeleton */}
              <div className="bg-[#161616] border border-white/5 rounded-3xl p-8">
                <div className="w-24 h-6 bg-white/10 rounded-lg mb-6"></div>
                <div className="space-y-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0"></div>
                      <div className="w-32 h-4 bg-white/10 rounded-md"></div>
                    </div>
                  ))}
                </div>
              </div>
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

  // --- LÓGICA DINÁMICA DEL CUADRO ---
  // Si la DB no devuelve partidos para una ronda, rellenamos con vacíos para que la UI no se rompa
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

  const partidosCuartos = getRoundMatches("CUARTOS", 4);
  const partidosSemis = getRoundMatches("SEMIS", 2);
  const partidoFinal = getRoundMatches("FINAL", 1);

  const isAbierto =
    torneo.estado === "Inscripción" || torneo.estado === "Borrador";
  const isIndividual = torneo.modalidad === "Individual";
  const hasPremios = torneo.premio_1 || torneo.premio_2 || torneo.premio_3;

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
              <span className="flex items-center gap-2">
                {isIndividual ? (
                  <User className="size-4 text-padel-4" />
                ) : (
                  <Users className="size-4 text-padel-4" />
                )}
                {torneo.cupos_actuales || 0}/{torneo.cupos_maximos || 16}{" "}
                {isIndividual ? "jugadores" : "duplas"}
              </span>
              {hasPremios && (
                <span className="flex items-center gap-2">
                  <Trophy className="size-4 text-padel-4" /> Premios en juego
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleInscripcion}
            disabled={inscribiendo || !isAbierto}
            className="relative z-10 shrink-0 w-full lg:w-auto bg-padel-4 hover:bg-[#b3e600] text-[#111] px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(204,255,0,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            {inscribiendo ? (
              "Procesando..."
            ) : (
              <>
                {isIndividual ? "Inscribirme" : "Inscribir mi dupla"}{" "}
                <ArrowRight className="size-5" />
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: CUADRO PRINCIPAL */}
          <div className="lg:col-span-2 bg-[#161616] border border-white/5 rounded-3xl p-6 lg:p-8 overflow-x-auto shadow-xl">
            <div className="flex justify-between items-center mb-10 min-w-150">
              <h2 className="text-2xl font-bold text-white">
                Cuadro principal
              </h2>
              {partidos.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>{" "}
                  En vivo
                </div>
              )}
            </div>

            <div className="flex gap-8 lg:gap-12 min-w-150 pb-4">
              <div className="flex-1 flex flex-col justify-around gap-6">
                <h3 className="text-center text-xs font-black text-padel-4 uppercase tracking-widest mb-4">
                  Cuartos
                </h3>
                {partidosCuartos.map((p) => (
                  <MatchCard key={p.id} partido={p} />
                ))}
              </div>
              <div className="flex-1 flex flex-col justify-around gap-16 relative">
                <h3 className="text-center text-xs font-black text-padel-4 uppercase tracking-widest mb-4 absolute top-0 w-full">
                  Semis
                </h3>
                <div className="mt-12 space-y-24">
                  {partidosSemis.map((p) => (
                    <MatchCard key={p.id} partido={p} />
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center relative">
                <h3 className="text-center text-xs font-black text-padel-4 uppercase tracking-widest mb-4 absolute top-0 w-full">
                  Final
                </h3>
                {partidoFinal.map((p) => (
                  <MatchCard key={p.id} partido={p} />
                ))}
              </div>
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
              <button
                onClick={handleInscripcion}
                disabled={inscribiendo || !isAbierto}
                className="w-full bg-padel-4 hover:bg-[#b3e600] text-[#111] py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] disabled:opacity-50 disabled:shadow-none"
              >
                {isIndividual ? "Inscribirme" : "Inscribir mi dupla"}
              </button>
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
    </div>
  );
}
