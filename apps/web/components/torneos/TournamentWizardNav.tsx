"use client";

import React, { useState } from "react";
import {
  Search,
  X,
  FileText,
  Image as ImageIcon,
  Layers,
  Users,
  MapPin,
  ShieldCheck,
  Award,
  GitBranch,
  Trophy,
  Lock,
  Check,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";

export interface StepDefinition {
  id: string;
  number: number;
  label: string;
  desc: string;
  group: "config" | "logistics" | "competition";
  keywords: string[];
  icon: React.ElementType;
}

export const ALL_STEPS: StepDefinition[] = [
  {
    id: "edit",
    number: 1,
    label: "Datos",
    desc: "Información general y fechas",
    group: "config",
    keywords: ["datos", "informacion", "fecha", "nombre", "club", "formato", "reglas"],
    icon: FileText,
  },
  {
    id: "logos",
    number: 2,
    label: "Logos",
    desc: "Patrocinadores y afiche",
    group: "config",
    keywords: ["logos", "sponsors", "patrocinadores", "marcas", "afiche", "banner"],
    icon: ImageIcon,
  },
  {
    id: "categories",
    number: 3,
    label: "Categorías",
    desc: "Clases y división",
    group: "config",
    keywords: ["categorias", "clases", "parejas", "division", "rama", "nivel"],
    icon: Layers,
  },
  {
    id: "players",
    number: 4,
    label: "Jugadores",
    desc: "Inscripciones y parejas",
    group: "logistics",
    keywords: ["jugadores", "inscripciones", "pago", "dni", "pareja", "confirmacion"],
    icon: Users,
  },
  {
    id: "times",
    number: 5,
    label: "Sedes",
    desc: "Canchas y disponibilidades",
    group: "logistics",
    keywords: ["sedes", "canchas", "horarios", "disponibilidad", "turnos", "club"],
    icon: MapPin,
  },
  {
    id: "fiscales",
    number: 6,
    label: "Fiscales",
    desc: "Cuerpo arbitral",
    group: "logistics",
    keywords: ["fiscales", "arbitros", "cuerpo arbitral", "juez", "fiscal"],
    icon: ShieldCheck,
  },
  {
    id: "cierre",
    number: 7,
    label: "Cierre",
    desc: "Reglas y puntuación",
    group: "logistics",
    keywords: ["cierre", "puntuacion", "ranking", "ventaja", "tie-break", "punto de oro", "star point"],
    icon: Award,
  },
  {
    id: "draws",
    number: 8,
    label: "Cuadros",
    desc: "Editor de llaves y fixture",
    group: "competition",
    keywords: ["cuadros", "llaves", "bracket", "fixture", "zonas", "semillas", "bye", "arbol"],
    icon: GitBranch,
  },
  {
    id: "matches",
    number: 9,
    label: "Resultados",
    desc: "Carga de marcadores y en vivo",
    group: "competition",
    keywords: ["resultados", "arbitraje", "marcador", "sets", "ganador", "walkover", "w.o."],
    icon: Trophy,
  },
];

const GROUP_TITLES: Record<string, string> = {
  config: "1. Configuración Inicial",
  logistics: "2. Logística y Participantes",
  competition: "3. Cuadros y Competencia",
};

interface TournamentWizardNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void | Promise<void>;
  torneoEstado?: string;
}

export function TournamentWizardNav({
  activeTab,
  setActiveTab,
  torneoEstado,
}: TournamentWizardNavProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const isReadOnlyMode =
    torneoEstado === "En curso" || torneoEstado === "Finalizado";

  // Filtrado por buscador
  const filteredSteps = ALL_STEPS.filter((step) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      step.label.toLowerCase().includes(q) ||
      step.desc.toLowerCase().includes(q) ||
      step.keywords.some((k) => k.includes(q))
    );
  });

  const activeStepObj = ALL_STEPS.find((s) => s.id === activeTab) || ALL_STEPS[0];

  const handleSelectStep = (stepId: string) => {
    void setActiveTab(stepId);
    setMobileOpen(false);
  };

  const renderStepItem = (step: StepDefinition) => {
    const isActive = activeTab === step.id;
    const isStepReadOnly = isReadOnlyMode && step.number <= 6;
    const IconComponent = step.icon;

    return (
      <button
        key={step.id}
        type="button"
        onClick={() => handleSelectStep(step.id)}
        className={`w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center justify-between group border cursor-pointer ${
          isActive
            ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse shadow-lg font-bold"
            : "bg-black/20 hover:bg-black/40 text-gray-300 hover:text-white border-white/5"
        }`}
      >
        <div className="flex items-center gap-3 truncate pr-1">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black transition-all ${
              isActive
                ? "bg-brand-black/20 text-brand-black"
                : "bg-white/5 text-brand-chartreuse border border-brand-chartreuse/20"
            }`}
          >
            <IconComponent className="size-4" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold tracking-tight truncate">
                {step.number}. {step.label}
              </span>
            </div>
            <p
              className={`text-[10px] truncate mt-0.5 ${
                isActive ? "text-brand-black/80 font-semibold" : "text-gray-400"
              }`}
            >
              {step.desc}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {isStepReadOnly && (
            <span
              title="Paso bloqueado en modo lectura"
              className={`p-1 rounded-lg text-[9px] font-bold flex items-center gap-1 ${
                isActive
                  ? "bg-black/20 text-brand-black"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              }`}
            >
              <Lock className="size-3" />
            </span>
          )}
          {isActive && !isStepReadOnly && (
            <span className="w-2 h-2 rounded-full bg-brand-black animate-pulse" />
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full space-y-3">
      {/* SECTOR MOBILE: BARRA STICKY CON BOTÓN DESPLEGABLE */}
      <div className="lg:hidden sticky top-4 z-40 bg-brand-card border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/40 flex items-center justify-center font-black">
              {activeStepObj.number}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
                Navegación del Torneo
              </p>
              <p className="text-sm font-extrabold text-white flex items-center gap-2">
                Paso {activeStepObj.number}: {activeStepObj.label}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`size-5 text-gray-400 transition-transform duration-300 ${
              mobileOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {mobileOpen && (
          <div className="mt-4 pt-3 border-t border-white/10 space-y-4 animate-fadeIn">
            {/* Buscador Mobile */}
            <div className="relative">
              <Search className="size-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar paso (ej: Canchas, Fixture, Reglas)..."
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-brand-chartreuse"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Lista Mobile */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredSteps.map((step) => renderStepItem(step))}
            </div>
          </div>
        )}
      </div>

      {/* SECTOR DESKTOP: PANEL LATERAL FIJO / STICKY */}
      <div className="hidden lg:block bg-brand-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
        {/* Encabezado del Navegador */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-white">
            <LayoutGrid className="size-4 text-brand-chartreuse" />
            <h3 className="text-xs font-black uppercase tracking-wider">
              Índice de Pasos
            </h3>
          </div>
          <span className="text-[10px] font-black bg-brand-chartreuse/10 text-brand-chartreuse px-2 py-0.5 rounded-full border border-brand-chartreuse/20">
            9 Pasos
          </span>
        </div>

        {/* Buscador rápido */}
        <div className="relative">
          <Search className="size-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar opción (ej: Canchas, Fixture)..."
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-brand-chartreuse/60 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Lista Agrupada por Fases */}
        <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin pr-1">
          {searchQuery ? (
            /* Si hay búsqueda activa */
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                Resultados ({filteredSteps.length})
              </p>
              {filteredSteps.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 text-center">
                  No se encontraron pasos para "{searchQuery}"
                </p>
              ) : (
                filteredSteps.map((step) => renderStepItem(step))
              )}
            </div>
          ) : (
            /* Vista Agrupada normal */
            (["config", "logistics", "competition"] as const).map((groupKey) => {
              const groupSteps = ALL_STEPS.filter((s) => s.group === groupKey);
              return (
                <div key={groupKey} className="space-y-2">
                  <p className="text-[10px] text-brand-chartreuse font-black uppercase tracking-widest pl-1">
                    {GROUP_TITLES[groupKey]}
                  </p>
                  <div className="space-y-1.5">
                    {groupSteps.map((step) => renderStepItem(step))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
