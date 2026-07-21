"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Check } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo, Inscripcion, Partido } from "@/utils/types";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";

import { Paso1Datos } from "@/components/torneos/wizard/Paso1Datos";
import { Paso2Logos } from "@/components/torneos/wizard/Paso2Logos";
import { Paso3Categorias } from "@/components/torneos/wizard/Paso3Categorias";
import { Paso4Jugadores } from "@/components/torneos/wizard/Paso4Jugadores";
import { Paso5Cierre } from "@/components/torneos/wizard/Paso6Cierre";
import { Paso6Cuadros } from "@/components/torneos/wizard/Paso7Cuadros";
import { Paso7Sedes } from "@/components/torneos/wizard/Paso5Sedes";
import { Paso8Arbitraje } from "@/components/torneos/wizard/Paso8Arbitraje";


const WIZARD_STEPS = [
  { id: "edit", label: "1. Datos", desc: "Información" },
  { id: "logos", label: "2. Logos", desc: "Patrocinadores" },
  { id: "categories", label: "3. Categorías", desc: "Clases" },
  { id: "players", label: "4. Jugadores", desc: "Inscripciones" },
  { id: "times", label: "5. Sedes", desc: "Canchas & Horas" },
  { id: "cierre", label: "6. Cierre", desc: "Puntuación" },
  { id: "draws", label: "7. Cuadros", desc: "Fixture" },
  { id: "matches", label: "8. Arbitraje", desc: "Marcadores" },
];

export default function ClubTorneoDetallePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [refreshKey, setRefreshKey] = useState(0);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  const triggerRefresh = () => setRefreshKey((p) => p + 1);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    const fetchTorneoData = async () => {
      try {
        if (isMounted && refreshKey === 0) setLoading(true);
        const [dataTorneo, dataInscripciones, dataPartidos] = await Promise.all(
          [
            TorneosService.getById(id),
            TorneosService.getInscripcionesConfirmadas(id).catch(() => []),
            TorneosService.getPartidos(id).catch(() => []),
          ],
        );

        if (isMounted) {
          setTorneo(dataTorneo);
          setInscripciones(dataInscripciones as Inscripcion[]);
          setPartidos(dataPartidos as Partido[]);
        }
      } catch (error) {
        console.error("Error al cargar los datos del torneo:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchTorneoData();
    return () => {
      isMounted = false;
    };
  }, [id, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-chartreuse"></div>
      </div>
    );
  }

  if (!torneo) return null;

  const commonProps = {
    torneo,
    torneoId: id,
    setFeedbackModal,
    triggerRefresh,
    setActiveTab,
  };

  return (
    <div className="space-y-8">
      {/* HEADER DETALLE */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/club/torneos")}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-brand-white">
              {torneo.nombre}
            </h1>
            <span className="bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20 px-3 py-1 rounded-full text-xs font-black uppercase">
              {torneo.estado}
            </span>
          </div>
          <p className="text-gray-400 mt-1 text-xs sm:text-sm font-medium">
            {(torneo as any).rama ? `${(torneo as any).rama} · ` : ""}
            {torneo.nivel} · {torneo.categoria} · {torneo.modalidad}
          </p>
        </div>
      </div>

      {/* STEPPER NAVEGABLE */}
      <div className="bg-brand-card border border-brand-white/5 p-4 sm:p-6 rounded-3xl overflow-x-auto shadow-xl">
        <div className="flex items-center justify-between min-w-200 gap-2">
          {WIZARD_STEPS.map((step, idx) => {
            const isActive = activeTab === step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setActiveTab(step.id)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all cursor-pointer text-center shrink-0 ${
                    isActive
                      ? "bg-brand-chartreuse text-brand-black font-extrabold shadow-[0_0_15px_rgba(204,255,0,0.3)]"
                      : "hover:bg-brand-white/5 text-gray-400"
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-black tracking-wider ${
                      isActive ? "text-brand-black" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`text-[11px] ${
                      isActive ? "text-brand-black font-bold" : "text-gray-500"
                    }`}
                  >
                    {step.desc}
                  </span>
                </button>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className="h-0.5 w-6 min-w-4 shrink-0 bg-white/5" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="bg-brand-card border border-brand-white/5 p-6 sm:p-8 rounded-4xl shadow-2xl">
        {activeTab === "edit" && <Paso1Datos {...commonProps} />}
        {activeTab === "logos" && <Paso2Logos {...commonProps} />}
        {activeTab === "categories" && <Paso3Categorias {...commonProps} />}
        {activeTab === "players" && (
          <Paso4Jugadores {...commonProps} inscripciones={inscripciones} />
        )}
        {activeTab === "cierre" && (
          <Paso5Cierre {...commonProps} inscripciones={inscripciones} />
        )}
        {activeTab === "draws" && (
          <Paso6Cuadros
            {...commonProps}
            inscripciones={inscripciones}
            partidos={partidos}
          />
        )}
        {activeTab === "times" && <Paso7Sedes {...commonProps} />}
        {activeTab === "matches" && (
          <Paso8Arbitraje {...commonProps} partidos={partidos} />
        )}

      </div>

      <FeedbackModal {...feedbackModal} />
    </div>
  );
}
