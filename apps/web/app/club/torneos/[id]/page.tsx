"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo, Inscripcion, Partido } from "@/utils/types";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";

import { Paso1Datos } from "@/components/torneos/wizard/Paso1Datos";
import { Paso2Logos } from "@/components/torneos/wizard/Paso2Logos";
import { Paso3Categorias } from "@/components/torneos/wizard/Paso3Categorias";
import { Paso4Jugadores } from "@/components/torneos/wizard/Paso4Jugadores";
import { Paso5Cierre } from "@/components/torneos/wizard/Paso7Cierre";
import { Paso6Cuadros } from "@/components/torneos/wizard/Paso8Cuadros";
import { Paso7Sedes } from "@/components/torneos/wizard/Paso5Sedes";
import { Paso8Arbitraje } from "@/components/torneos/wizard/Paso9Arbitraje";
import { TournamentWizardNav } from "@/components/torneos/TournamentWizardNav";
import type { SaveStepHandler } from "@/components/torneos/wizard/types";
import {
  esEstadoTorneoModoLectura,
  isWizardPasoReadOnly,
  textoBannerModoLectura,
} from "@/components/torneos/wizard/stepLocks";
import { labelModalidad } from "@/utils/formatFecha";

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

  const onTorneoUpdated = useCallback((updated: Torneo) => {
    setTorneo((prev) => (prev ? { ...prev, ...updated } : updated));
  }, []);

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
    setActiveTab: navigateToTab,
    registerSaveHandler,
    onTorneoUpdated,
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* HEADER NAVEGACIÓN */}
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
            {(torneo as { rama?: string }).rama
              ? `${(torneo as { rama?: string }).rama} · `
              : ""}
            {torneo.nivel} · {torneo.categoria} ·{" "}
            {labelModalidad(torneo.modalidad)}
          </p>
        </div>
      </div>

      {esEstadoTorneoModoLectura(torneo.estado) && (
        <div className="bg-black/20 border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-gray-400 shadow-sm">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-chartreuse opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-chartreuse"></span>
          </span>
          <span>
            <strong className="text-white">Modo Lectura ({torneo.estado}):</strong>{" "}
            {textoBannerModoLectura(String(torneo.estado))}
          </span>
        </div>
      )}

      {/* GRID: contenido a la izquierda, navegación a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 items-start">
        {/* Navegador de pasos — derecha en desktop */}
        <div className="lg:col-span-1 order-1 lg:order-2 lg:sticky lg:top-6 self-start z-30 min-w-0">
          <TournamentWizardNav
            activeTab={activeTab}
            setActiveTab={navigateToTab}
            torneoEstado={torneo.estado}
            hiddenStepIds={["fiscales"]}
          />
        </div>

        {/* Contenido del paso activo — izquierda en desktop */}
        <div className="lg:col-span-3 order-2 lg:order-1 min-w-0 overflow-x-hidden">
          {activeTab === "edit" && (
            <Paso1Datos
              {...commonProps}
              readOnly={isWizardPasoReadOnly(torneo.estado, "edit")}
            />
          )}
          {activeTab === "logos" && (
            <Paso2Logos
              {...commonProps}
              readOnly={isWizardPasoReadOnly(torneo.estado, "logos")}
            />
          )}
          {activeTab === "categories" && (
            <Paso3Categorias
              {...commonProps}
              modoClub
              readOnly={isWizardPasoReadOnly(torneo.estado, "categories")}
            />
          )}
          {activeTab === "players" && (
            <Paso4Jugadores
              {...commonProps}
              inscripciones={inscripciones}
              readOnly={isWizardPasoReadOnly(torneo.estado, "players")}
            />
          )}
          {activeTab === "times" && (
            <Paso7Sedes
              {...commonProps}
              readOnly={isWizardPasoReadOnly(torneo.estado, "times")}
            />
          )}
          {activeTab === "cierre" && (
            <Paso5Cierre
              {...commonProps}
              inscripciones={inscripciones}
              readOnly={isWizardPasoReadOnly(torneo.estado, "cierre")}
            />
          )}
          {activeTab === "draws" && (
            <Paso6Cuadros
              {...commonProps}
              inscripciones={inscripciones}
              partidos={partidos}
              isReadOnly={isWizardPasoReadOnly(torneo.estado, "draws")}
            />
          )}
          {activeTab === "matches" && (
            <Paso8Arbitraje
              {...commonProps}
              partidos={partidos}
              isReadOnly={isWizardPasoReadOnly(torneo.estado, "matches")}
            />
          )}
        </div>
      </div>

      <FeedbackModal {...feedbackModal} />
    </div>
  );
}
