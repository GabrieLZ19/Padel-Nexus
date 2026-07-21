"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Check } from "lucide-react";
import { TorneosService } from "../../../../utils/services/torneos";
import { Torneo, Inscripcion, Partido } from "../../../../utils/types";
import FeedbackModal, {
  FeedbackModalProps,
} from "../../../../components/ui/FeedbackModal";

// Importación de los 9 pasos modularizados
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

export default function TorneoDetallePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  // Estados Globales de Datos
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);

  // Estados de UI
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  const triggerRefresh = () => setRefreshKey((p) => p + 1);

  // Carga inicial de datos
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

  // Manejo de Loading y Errores
  if (loading) return <SkeletonLoader />;
  if (!torneo) return <TorneoNoEncontrado router={router} />;

  // Props compartidas que los pasos van a necesitar
  const commonProps = {
    torneo,
    torneoId: id,
    setFeedbackModal,
    triggerRefresh,
    setActiveTab,
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-6 md:px-10 md:py-10">
      {/* HEADER */}
      <HeaderNavegacion
        torneo={torneo}
        onBack={() => router.push("/dashboard/torneos")}
      />

      {/* TABS WIZARD */}
      <WizardTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        steps={WIZARD_STEPS}
      />

      {/* RENDERIZADO DINÁMICO DE PASOS */}
      <div className="pt-4">
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

// ============================================================================
// COMPONENTES DE INTERFAZ AISLADOS (Header, Tabs, Skeletons y Errores)
// ============================================================================

interface HeaderProps {
  torneo: Torneo;
  onBack: () => void;
}

const HeaderNavegacion = ({ torneo, onBack }: HeaderProps) => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
    <div className="flex items-start sm:items-center gap-4">
      <button
        onClick={onBack}
        className="w-10 h-10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer"
      >
        <ArrowLeft className="size-5" />
      </button>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex flex-wrap items-center gap-3">
          {torneo.nombre}
          <span className="text-xs font-black bg-brand-chartreuse/20 text-brand-chartreuse px-3 py-1 rounded-full uppercase tracking-wider">
            {torneo.estado || "Borrador"}
          </span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base font-medium">
          {(torneo as any).rama ? `${(torneo as any).rama} · ` : ""}
          {torneo.nivel} · {torneo.categoria} · {torneo.modalidad}
        </p>
      </div>
    </div>
  </div>
);

interface WizardTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  steps: typeof WIZARD_STEPS;
}

const WizardTabs = ({ activeTab, setActiveTab, steps }: WizardTabsProps) => (
  <div className="bg-[#161616] border border-white/5 rounded-3xl p-6 shadow-md">
    <div className="flex items-center justify-between overflow-x-auto gap-4 pb-2 scrollbar-thin">
      {steps.map((step, idx) => {
        const isActive = activeTab === step.id;
        const isCompleted = steps.findIndex((s) => s.id === activeTab) > idx;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => setActiveTab(step.id)}
              className="flex items-center gap-3 shrink-0 text-left cursor-pointer group outline-none py-2"
            >
              <div
                className={`size-10 rounded-full flex items-center justify-center font-black text-sm transition-all border-2 ${
                  isActive
                    ? "bg-brand-chartreuse border-brand-chartreuse text-brand-black shadow-[0_0_15px_rgba(204,255,0,0.3)] scale-105"
                    : isCompleted
                      ? "bg-brand-chartreuse/10 border-brand-chartreuse text-brand-chartreuse"
                      : "bg-[#222222] border-white/10 text-gray-500 group-hover:border-white/20 group-hover:text-gray-300"
                }`}
              >
                {isCompleted ? <Check className="size-4" /> : idx + 1}
              </div>
              <div>
                <p
                  className={`text-xs font-black uppercase tracking-wider transition-colors ${
                    isActive
                      ? "text-brand-chartreuse"
                      : isCompleted
                        ? "text-white"
                        : "text-gray-500 group-hover:text-gray-300"
                  }`}
                >
                  {step.label.slice(3)}
                </p>
                <p className="text-[10px] font-bold text-gray-500 mt-0.5 whitespace-nowrap">
                  {step.desc}
                </p>
              </div>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 min-w-5 shrink-0 ${
                  isCompleted ? "bg-brand-chartreuse" : "bg-white/5"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

const SkeletonLoader = () => (
  <div className="w-full max-w-[1600px] mx-auto px-4 py-6 md:px-10 md:py-10 animate-pulse min-h-screen bg-[#111111]">
    <div className="w-32 h-6 bg-white/5 rounded-md mb-8"></div>
    <div className="bg-[#161616] rounded-3xl p-8 lg:p-12 mb-8 border border-white/5">
      <div className="w-48 h-6 bg-white/10 rounded-full mb-6"></div>
      <div className="w-3/4 h-12 bg-white/10 rounded-xl mb-4"></div>
      <div className="flex gap-4">
        <div className="w-32 h-4 bg-white/10 rounded-md"></div>
        <div className="w-32 h-4 bg-white/10 rounded-md"></div>
      </div>
    </div>
    <div className="flex gap-6 mb-8 border-b border-white/10 pb-4">
      <div className="w-24 h-6 bg-white/10 rounded-md"></div>
      <div className="w-32 h-6 bg-white/10 rounded-md"></div>
      <div className="w-32 h-6 bg-white/10 rounded-md"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-40 bg-[#161616] rounded-3xl border border-white/5"></div>
      <div className="h-40 bg-[#161616] rounded-3xl border border-white/5"></div>
      <div className="h-40 bg-[#161616] rounded-3xl border border-white/5"></div>
    </div>
  </div>
);

const TorneoNoEncontrado = ({ router }: { router: any }) => (
  <div className="w-full h-screen flex flex-col items-center justify-center text-center px-4 bg-[#111111]">
    <Trophy className="size-16 text-gray-600 mb-4" />
    <h2 className="text-2xl font-bold text-white mb-2">Torneo no encontrado</h2>
    <button
      onClick={() => router.push("/dashboard/torneos")}
      className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-semibold mt-6 transition-colors cursor-pointer"
    >
      Volver
    </button>
  </div>
);
