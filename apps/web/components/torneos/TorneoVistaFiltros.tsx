"use client";

import { Search } from "lucide-react";
import {
  CONTADORES_VISTA_VACIOS,
  VISTAS_TORNEO,
  etiquetaVistaTorneo,
  type VistaTorneoId,
} from "@/utils/constants/padelConfig";

type VistaSeleccion = VistaTorneoId | "todos" | null;

interface TorneoVistaFiltrosProps {
  vista: VistaSeleccion;
  contadores?: Record<VistaTorneoId, number>;
  vistaAutomatica?: boolean;
  requierenProgramacion?: number;
  busqueda: string;
  onBusqueda: (valor: string) => void;
  onVista: (vista: VistaTorneoId | "todos") => void;
}

export default function TorneoVistaFiltros({
  vista,
  contadores = CONTADORES_VISTA_VACIOS,
  vistaAutomatica = false,
  requierenProgramacion = 0,
  busqueda,
  onBusqueda,
  onVista,
}: TorneoVistaFiltrosProps) {
  const vistaActiva = vista && vista !== "todos" ? vista : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="inline-flex w-full overflow-x-auto rounded-xl border border-white/5 bg-[#111111] p-1.5 sm:w-auto">
          {VISTAS_TORNEO.map((item) => {
            const activa = vistaActiva === item.id;
            const cantidad = contadores[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onVista(item.id)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  activa
                    ? "bg-brand-chartreuse text-brand-card shadow-[0_0_10px_rgba(204,255,0,0.15)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {item.label}
                <span className={`ml-2 text-xs ${activa ? "text-brand-card/70" : "text-gray-500"}`}>
                  {cantidad}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              placeholder="Nombre, fecha, sede o categoría"
              value={busqueda}
              onChange={(event) => onBusqueda(event.target.value)}
              className="w-full rounded-xl border border-white/5 bg-[#111111] py-2.5 pl-11 pr-4 text-sm text-white placeholder-gray-500 transition-colors focus:border-brand-chartreuse/50 focus:outline-none"
            />
          </div>
          <select
            aria-label="Alcance del listado"
            value={vista === "todos" ? "todos" : "vista"}
            onChange={(event) => {
              if (event.target.value === "todos") {
                onVista("todos");
                return;
              }
              onVista(vistaActiva ?? "en_curso");
            }}
            className="rounded-xl border border-white/5 bg-[#111111] px-3 py-2.5 text-sm text-white focus:border-brand-chartreuse/50 focus:outline-none"
          >
            <option value="vista">Vista actual</option>
            <option value="todos">Todos los estados</option>
          </select>
        </div>
      </div>

      {vistaAutomatica && vistaActiva && (
        <p className="text-sm text-gray-400">
          Abrimos <span className="font-semibold text-white">{etiquetaVistaTorneo(vistaActiva)}</span> porque concentra el trabajo más urgente.
        </p>
      )}
      {vistaActiva === "preparacion" && requierenProgramacion > 0 && (
        <p className="text-sm font-semibold text-brand-chartreuse">
          {requierenProgramacion} requieren programación
        </p>
      )}
    </div>
  );
}
