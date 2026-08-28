"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Check } from "lucide-react";
import { TorneosService } from "../../../../utils/services/torneos";
import { Torneo, Inscripcion, Partido } from "../../../../utils/types";
import FeedbackModal, {
  FeedbackModalProps,
} from "../../../../components/ui/FeedbackModal";

// Importación de los pasos modularizados
import { Paso1Datos } from "@/components/torneos/wizard/Paso1Datos";
import { Paso2Logos } from "@/components/torneos/wizard/Paso2Logos";
import { Paso3Categorias } from "@/components/torneos/wizard/Paso3Categorias";
import { Paso4Jugadores } from "@/components/torneos/wizard/Paso4Jugadores";
import { Paso7Sedes } from "@/components/torneos/wizard/Paso5Sedes";
import { Paso6Fiscales } from "@/components/torneos/wizard/Paso6Fiscales";
import { Paso5Cierre } from "@/components/torneos/wizard/Paso7Cierre";
import { Paso6Cuadros } from "@/components/torneos/wizard/Paso8Cuadros";
import { Paso8Arbitraje } from "@/components/torneos/wizard/Paso9Arbitraje";
import { TournamentWizardNav } from "@/components/torneos/TournamentWizardNav";
import type { SaveStepHandler } from "@/components/torneos/wizard/types";
import { useProfileStore } from "@/store/useProfileStore";
import { esRolFiscal } from "@/utils/auth/roles";
import { labelModalidad } from "@/utils/formatFecha";

const WIZARD_STEPS = [
  { id: "edit", label: "1. Datos", desc: "Información" },
  { id: "logos", label: "2. Logos", desc: "Patrocinadores" },
  { id: "categories", label: "3. Categorías", desc: "Clases" },
  { id: "players", label: "4. Jugadores", desc: "Inscripciones" },
  { id: "times", label: "5. Sedes", desc: "Canchas & Horas" },
  { id: "fiscales", label: "6. Fiscales", desc: "Autoridades" },
  { id: "cierre", label: "7. Cierre", desc: "Puntuación" },
  { id: "draws", label: "8. Cuadros", desc: "Fixture" },
  { id: "matches", label: "9. Resultados", desc: "Marcadores" },
];

export default function TorneoDetallePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);

  useEffect(() => {
    if (esRolFiscal(profile?.rol) && id) {
      router.replace(`/dashboard/fiscal/torneos/${id}`);
    }
  }, [profile?.rol, id, router]);

  // Estados Globales de Datos
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);

  // Estados de UI
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const saveHandlerRef = useRef<SaveStepHandler | null>(null);
  const activeTabRef = useRef(activeTab);
  const navigatingRef = useRef(false);
  activeTabRef.current = activeTab;

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  const triggerRefresh = () => setRefreshKey((p) => p + 1);

  const registerSaveHandler = useCallback((handler: SaveStepHandler | null) => {
    saveHandlerRef.current = handler;
  }, []);

  /** Guarda el paso actual (si tiene handler) y luego cambia de tab. */
  const navigateToTab = useCallback(async (nextTab: string) => {
    if (nextTab === activeTabRef.current || navigatingRef.current) return;
    const save = saveHandlerRef.current;
    if (save) {
      navigatingRef.current = true;
      try {
        const ok = await save();
        if (!ok) return;
      } finally {
        navigatingRef.current = false;
      }
    }
    setActiveTab(nextTab);
  }, []);

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
    setActiveTab: navigateToTab,
    registerSaveHandler,
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-6 md:px-10 md:py-10">
      {/* HEADER */}
      <HeaderNavegacion
        torneo={torneo}
        onBack={() => router.push("/dashboard/torneos")}
      />

      {/* BANNER AVISO MODO SOLO LECTURA SI EL TORNEO ESTÁ EN CURSO O FINALIZADO */}
      {(torneo.estado === "En curso" || torneo.estado === "Finalizado") && (
        <div className="bg-black/20 border border-white/10 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs my-1 shadow-sm">
          <div className="flex items-center gap-2.5 text-gray-400">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-chartreuse opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-chartreuse"></span>
            </span>
            <span>
              <strong className="text-white">Modo Lectura ({torneo.estado}):</strong> Los pasos 1 a 6 están bloqueados. Los cuadros (Paso 8) y la carga de resultados (Paso 9) permanecen habilitados.
            </span>
          </div>
        </div>
      )}

      {/* GRID DE LAYOUT NATIVO DE NAVEGACIÓN Y CONTENIDO */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 items-start">
        {/* NAVEGADOR DE PASOS LATERAL / MOBILE */}
        <div className="lg:col-span-1 order-1 lg:order-2 lg:sticky lg:top-6 self-start z-30 min-w-0">
          <TournamentWizardNav
            activeTab={activeTab}
            setActiveTab={navigateToTab}
            torneoEstado={torneo.estado}
          />
        </div>

        {/* CONTENIDO DEL PASO ACTIVO */}
        <div className="lg:col-span-3 order-2 lg:order-1 min-w-0 overflow-x-hidden">
          {activeTab === "edit" && (
            <Paso1Datos
              {...commonProps}
              readOnly={
                torneo.estado === "En curso" || torneo.estado === "Finalizado"
              }
            />
          )}
          {activeTab === "logos" && (
            <Paso2Logos
              {...commonProps}
              readOnly={
                torneo.estado === "En curso" || torneo.estado === "Finalizado"
              }
            />
          )}
          {activeTab === "categories" && (
            <Paso3Categorias
              {...commonProps}
              readOnly={
                torneo.estado === "En curso" || torneo.estado === "Finalizado"
              }
            />
          )}
          {activeTab === "players" && (
            <Paso4Jugadores
              {...commonProps}
              inscripciones={inscripciones}
              readOnly={
                torneo.estado === "En curso" || torneo.estado === "Finalizado"
              }
            />
          )}
          {activeTab === "times" && (
            <Paso7Sedes
              {...commonProps}
              readOnly={
                torneo.estado === "En curso" || torneo.estado === "Finalizado"
              }
            />
          )}
          {activeTab === "fiscales" && (
            <Paso6Fiscales
              {...commonProps}
              readOnly={
                torneo.estado === "En curso" || torneo.estado === "Finalizado"
              }
            />
          )}
          {activeTab === "cierre" && (
            <Paso5Cierre {...commonProps} inscripciones={inscripciones} />
          )}
          {activeTab === "draws" && (
            <Paso6Cuadros
              {...commonProps}
              inscripciones={inscripciones}
              partidos={partidos}
              isReadOnly={torneo.estado === "Finalizado"}
            />
          )}
          {activeTab === "matches" && (
            <Paso8Arbitraje
              {...commonProps}
              torneoId={id}
              partidos={partidos}
              isReadOnly={torneo.estado === "Finalizado"}
            />
          )}
        </div>
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
          {torneo.nivel} · {torneo.categoria} · {labelModalidad(torneo.modalidad)}
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
