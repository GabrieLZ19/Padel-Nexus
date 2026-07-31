"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Shield, Calendar, Users, Eye } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo, Inscripcion, Partido } from "@/utils/types";

// Importación exclusiva de componentes de lectura
import { Paso6Cuadros } from "@/components/torneos/wizard/Paso8Cuadros";
import { Paso8Arbitraje } from "@/components/torneos/wizard/Paso9Arbitraje";

export default function TorneoEspectadorPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"cuadros" | "partidos">("cuadros");

  useEffect(() => {
    if (!id) return;
    const fetchTorneoData = async () => {
      try {
        setLoading(true);
        const [dataTorneo, dataInscripciones, dataPartidos] = await Promise.all(
          [
            TorneosService.getById(id),
            TorneosService.getInscripcionesConfirmadas(id).catch(() => []),
            TorneosService.getPartidos(id).catch(() => []),
          ],
        );

        setTorneo(dataTorneo);
        setInscripciones(dataInscripciones as Inscripcion[]);
        setPartidos(dataPartidos as Partido[]);
      } catch (error) {
        console.error("Error al cargar los datos del torneo:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchTorneoData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 font-semibold max-w-7xl mx-auto">
        Cargando llaves y marcadores del torneo...
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="p-12 text-center text-gray-500 font-semibold max-w-7xl mx-auto">
        Torneo no encontrado.
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-6 md:px-10 md:py-10">
      {/* Header Espectador */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#161616] p-6 rounded-3xl border border-white/5 shadow-2xl">
        <div className="flex items-start sm:items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase tracking-widest mb-1">
              <Eye className="size-4" /> Visor Oficial de Fixture & Llaves (Solo
              Lectura)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex flex-wrap items-center gap-3">
              {torneo.nombre}
              <span className="text-xs font-black bg-brand-chartreuse/20 text-brand-chartreuse px-3 py-1 rounded-full uppercase tracking-wider">
                {torneo.estado || "Borrador"}
              </span>
            </h1>
            <p className="text-gray-400 mt-1 text-sm font-medium">
              {(torneo as any).rama ? `${(torneo as any).rama} · ` : ""}
              {torneo.nivel} · {torneo.categoria} · {torneo.modalidad}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Espectador */}
      <div className="flex border-b border-white/10 space-x-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab("cuadros")}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === "cuadros"
              ? "border-brand-chartreuse text-brand-chartreuse font-extrabold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Cuadros & Llaves del Torneo
        </button>
        <button
          onClick={() => setActiveTab("partidos")}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === "partidos"
              ? "border-brand-chartreuse text-brand-chartreuse font-extrabold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Lista de Partidos & Marcadores ({partidos.length})
        </button>
      </div>

      {/* Vista según Tab seleccionada */}
      <div className="pt-2">
        {activeTab === "cuadros" && (
          <Paso6Cuadros
            torneo={torneo}
            torneoId={id}
            inscripciones={inscripciones}
            partidos={partidos}
            setFeedbackModal={() => {}}
            triggerRefresh={() => {}}
            setActiveTab={() => {}}
            isReadOnly={true}
          />
        )}
        {activeTab === "partidos" && (
          <Paso8Arbitraje
            partidos={partidos}
            setFeedbackModal={() => {}}
            triggerRefresh={() => {}}
            setActiveTab={() => {}}
            isReadOnly={true}
          />
        )}
      </div>
    </div>
  );
}
