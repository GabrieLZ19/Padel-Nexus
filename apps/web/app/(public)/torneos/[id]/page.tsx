"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Users,
  Trophy,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  ChevronLeft,
} from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { Partido, Torneo } from "@/utils/types/index";

const MatchCard = ({ partido }: { partido: Partido }) => (
  <div className="bg-padel-5 border border-white/5 rounded-xl overflow-hidden flex flex-col w-full text-sm shadow-lg">
    <div
      className={`flex justify-between items-center p-3 border-b border-white/5 ${partido.ganador_id === partido.equipoA?.id ? "bg-white/2" : ""}`}
    >
      <span
        className={`font-semibold ${partido.ganador_id === partido.equipoA?.id ? "text-white" : "text-gray-400"}`}
      >
        {partido.equipoA
          ? `${partido.equipoA.jugador1}/${partido.equipoA.jugador2}`
          : "-"}
      </span>
      <span
        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-black ${partido.set1A !== undefined && partido.set1A > (partido.set1B || 0) ? "bg-padel-4 text-padel-1" : "bg-padel-1 text-gray-500"}`}
      >
        {partido.set1A ?? "-"}
      </span>
    </div>
    <div
      className={`flex justify-between items-center p-3 ${partido.ganador_id === partido.equipoB?.id ? "bg-white/2" : ""}`}
    >
      <span
        className={`font-semibold ${partido.ganador_id === partido.equipoB?.id ? "text-white" : "text-gray-400"}`}
      >
        {partido.equipoB
          ? `${partido.equipoB.jugador1}/${partido.equipoB.jugador2}`
          : "-"}
      </span>
      <span
        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-black ${partido.set1B !== undefined && partido.set1B > (partido.set1A || 0) ? "bg-padel-4 text-padel-1" : "bg-padel-1 text-gray-500"}`}
      >
        {partido.set1B ?? "-"}
      </span>
    </div>
  </div>
);

export default function TorneoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const torneoId = params.id as string;

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inscribiendo, setInscribiendo] = useState<boolean>(false);

  // Fetch de los datos reales del torneo
  useEffect(() => {
    let isMounted = true;

    TorneosService.getById(torneoId)
      .then((data) => {
        if (isMounted) {
          setTorneo(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error al cargar el detalle del torneo:", error);
        // Si el backend falla, podríamos mostrar un mock o redirigir
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [torneoId]);

  // Mock de la estructura de llaves (Bracket) según tu diseño W26
  // Esto está tipado para que lo reemplaces directo con el array de tu BD después
  const partidosCuartos: Partido[] = [
    {
      id: "c1",
      ronda: "CUARTOS",
      equipoA: { id: "e1", jugador1: "Di Nenno", jugador2: "Stupa" },
      equipoB: { id: "e2", jugador1: "Rivas", jugador2: "Sosa" },
      set1A: 2,
      set1B: 0,
      ganador_id: "e1",
    },
    {
      id: "c2",
      ronda: "CUARTOS",
      equipoA: { id: "e3", jugador1: "Garrido", jugador2: "Chingo" },
      equipoB: { id: "e4", jugador1: "Cardona", jugador2: "Mati" },
      set1A: 1,
      set1B: 2,
      ganador_id: "e4",
    },
    {
      id: "c3",
      ronda: "CUARTOS",
      equipoA: { id: "e5", jugador1: "Galán", jugador2: "Lebrón" },
      equipoB: { id: "e6", jugador1: "Yanguas", jugador2: "Gil" },
      set1A: 2,
      set1B: 1,
      ganador_id: "e5",
    },
    {
      id: "c4",
      ronda: "CUARTOS",
      equipoA: { id: "e7", jugador1: "Tapia", jugador2: "Coello" },
      equipoB: { id: "e8", jugador1: "Nieto", jugador2: "Ruiz" },
      set1A: 2,
      set1B: 0,
      ganador_id: "e7",
    },
  ];

  const partidosSemis: Partido[] = [
    {
      id: "s1",
      ronda: "SEMIS",
      equipoA: { id: "e1", jugador1: "Di Nenno", jugador2: "Stupa" },
      equipoB: { id: "e4", jugador1: "Cardona", jugador2: "Mati" },
      set1A: 2,
      set1B: 1,
      ganador_id: "e1",
    },
    {
      id: "s2",
      ronda: "SEMIS",
      equipoA: { id: "e5", jugador1: "Galán", jugador2: "Lebrón" },
      equipoB: { id: "e7", jugador1: "Tapia", jugador2: "Coello" },
      set1A: 2,
      set1B: 0,
      ganador_id: "e5",
    },
  ];

  const partidoFinal: Partido[] = [
    {
      id: "f1",
      ronda: "FINAL",
      equipoA: { id: "e1", jugador1: "Di Nenno", jugador2: "Stupa" },
      equipoB: { id: "e5", jugador1: "Galán", jugador2: "Lebrón" },
    },
  ];

  const handleInscripcion = () => {
    setInscribiendo(true);
    // Lógica futura: Redirigir al checkout o abrir modal
    setTimeout(() => {
      alert("Flujo de pago e inscripción en construcción (Fase 2)");
      setInscribiendo(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-88px)] flex items-center justify-center text-padel-4 font-bold animate-pulse">
        Cargando torneo...
      </div>
    );
  }

  // Fallback si la API no devuelve nada temporalmente
  const tData: Torneo = torneo ?? {
    id: "mock-torneo",
    nombre: "Torneo de Prueba",
    nivel: "5ª",
    categoria: "CABALLEROS",
    estado: "Inscripción",
    cupos_actuales: 12,
    cupos_maximos: 16,
    clubes: { id: "mock-club", nombre: "Club Náutico - Pilar" },
  };

  return (
    <div className="max-w-350 mx-auto px-10 py-10">
      {/* Botón Volver */}
      <button
        onClick={() => router.push("/torneos")}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold mb-8"
      >
        <ChevronLeft className="size-4" /> Volver a torneos
      </button>

      {/* ENCABEZADO DEL TORNEO */}
      <div className="bg-linear-to-r from-[#172002] to-padel-1 border border-padel-4/20 rounded-4xl p-10 mb-10 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-padel-4/10 blur-[100px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-padel-4 text-padel-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(204,255,0,0.3)]">
              {tData.nivel} {tData.categoria} · {tData.estado.toUpperCase()}
            </div>

            <h1 className="text-5xl font-black text-white tracking-tight">
              {tData.nombre}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-gray-300">
              <span className="flex items-center gap-2">
                <MapPin className="size-4 text-padel-4" />{" "}
                {tData.clubes?.nombre || "Sede General"}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="size-4 text-padel-4" /> Sáb 14 Mar · 09:00
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4 text-padel-4" />{" "}
                {tData.cupos_actuales || 12}/{tData.cupos_maximos || 16} duplas
              </span>
              <span className="flex items-center gap-2">
                <Trophy className="size-4 text-padel-4" /> $300.000 en premios
              </span>
            </div>
          </div>

          <button
            onClick={handleInscripcion}
            disabled={inscribiendo}
            className="shrink-0 bg-padel-4 hover:bg-[#b3e600] text-padel-1 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(204,255,0,0.2)] flex items-center gap-2 disabled:opacity-70"
          >
            {inscribiendo ? (
              "Procesando..."
            ) : (
              <>
                Inscribirme <ArrowRight className="size-5" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* COLUMNA IZQUIERDA: CUADRO PRINCIPAL (BRACKET) */}
        <div className="lg:col-span-2 bg-padel-5 border border-white/5 rounded-3xl p-8 overflow-x-auto">
          <div className="flex justify-between items-center mb-10 min-w-150">
            <h2 className="text-2xl font-bold text-white">Cuadro principal</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>{" "}
              En vivo
            </div>
          </div>

          {/* El Bracket Layout (Flexbox) */}
          <div className="flex gap-12 min-w-175 pb-4">
            {/* Cuartos */}
            <div className="flex-1 flex flex-col justify-around gap-6">
              <h3 className="text-center text-xs font-black text-padel-4 uppercase tracking-widest mb-4">
                Cuartos
              </h3>
              {partidosCuartos.map((p) => (
                <MatchCard key={p.id} partido={p} />
              ))}
            </div>

            {/* Semis */}
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

            {/* Final */}
            <div className="flex-1 flex flex-col justify-center relative">
              <h3 className="text-center text-xs font-black text-padel-4 uppercase tracking-widest mb-4 absolute top-0 w-full">
                Final
              </h3>
              <MatchCard partido={partidoFinal[0]} />
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: INSCRIPCIÓN Y PREMIOS */}
        <div className="space-y-6">
          {/* Card Inscripción */}
          <div className="bg-[#181d0a] border border-padel-4/30 rounded-3xl p-8 shadow-[0_0_40px_rgba(204,255,0,0.05)]">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Inscripción
            </div>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-5xl font-black text-padel-4 tracking-tight">
                $24.000
              </span>
              <span className="text-gray-400 font-semibold mb-1">/ dupla</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                <Users className="size-5 text-padel-4" /> Inscripción por dupla
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                <ShieldCheck className="size-5 text-padel-4" /> Requiere
                licencia vigente
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                <CreditCard className="size-5 text-padel-4" /> Pago total o 50%
                parcial
              </li>
            </ul>

            <button
              onClick={handleInscripcion}
              className="w-full bg-padel-4 hover:bg-[#b3e600] text-padel-1 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)]"
            >
              Inscribir mi dupla
            </button>
          </div>

          {/* Card Premios */}
          <div className="bg-padel-5 border border-white/5 rounded-3xl p-8">
            <h3 className="text-lg font-bold text-white mb-6">Premios</h3>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-black text-sm border border-yellow-500/30">
                  1º
                </div>
                <div className="font-semibold text-gray-300">
                  $180.000 + trofeo
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-400/20 text-gray-400 flex items-center justify-center font-black text-sm border border-gray-400/30">
                  2º
                </div>
                <div className="font-semibold text-gray-300">
                  $80.000 + medalla
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 flex items-center justify-center font-black text-sm border border-amber-700/30">
                  3º
                </div>
                <div className="font-semibold text-gray-300">$40.000</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
