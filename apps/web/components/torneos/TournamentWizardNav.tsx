"use client";

import React from "react";
import {
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
} from "lucide-react";
import {
  pasoBloqueadoPorAlcance,
  type WizardPasoId,
} from "@/components/torneos/wizard/stepLocks";

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
    desc: "Clubes y canchas del torneo",
    group: "logistics",
    keywords: ["sedes", "canchas", "club", "sede"],
    icon: MapPin,
  },
  {
    id: "fiscales",
    number: 6,
    label: "Fiscales",
    desc: "Autoridades del torneo",
    group: "logistics",
    keywords: ["fiscales", "autoridades", "arbitros", "juez", "fiscal", "general", "auxiliar"],
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

interface TournamentWizardNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void | Promise<void>;
  torneoEstado?: string;
  soloLectura?: boolean;
  puedeCargarResultados?: boolean;
  /** Pasos a ocultar (p. ej. fiscales en panel club). */
  hiddenStepIds?: string[];
}

export function TournamentWizardNav({
  activeTab,
  setActiveTab,
  torneoEstado,
  soloLectura,
  puedeCargarResultados,
  hiddenStepIds = [],
}: TournamentWizardNavProps) {
  const visibleSteps = ALL_STEPS.filter(
    (step) => !hiddenStepIds.includes(step.id),
  );

  return (
    <nav aria-label="Pasos del torneo" className="w-full min-w-0">
      <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 xl:grid-cols-9">
        {visibleSteps.map((step, index) => {
          const numero = index + 1;
          const isActive = activeTab === step.id;
          const bloqueado = pasoBloqueadoPorAlcance(
            {
              estado: torneoEstado,
              solo_lectura: soloLectura,
              puede_cargar_resultados: puedeCargarResultados,
            },
            step.id as WizardPasoId,
          );

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                title={
                  bloqueado
                    ? `${numero}. ${step.label}. Paso en modo lectura`
                    : `${numero}. ${step.label}`
                }
                onClick={() => void setActiveTab(step.id)}
                className={`flex h-full w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 text-center transition-colors ${
                  isActive
                    ? "border-brand-chartreuse bg-brand-chartreuse text-brand-black shadow-[0_0_0_1px_rgba(203,254,1,0.35)]"
                    : "wizard-step-idle border-white/15 bg-brand-card text-gray-300 hover:border-white/30 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-1">
                  <span
                    className={`text-[11px] font-black tabular-nums leading-none ${
                      isActive ? "text-brand-black" : "text-brand-chartreuse"
                    }`}
                  >
                    {numero}
                  </span>
                  {bloqueado ? (
                    <Lock
                      className={`size-3 ${
                        isActive ? "text-brand-black" : "text-amber-300"
                      }`}
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="text-[11px] font-bold leading-tight">
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
