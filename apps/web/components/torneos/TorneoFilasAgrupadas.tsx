"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { EstadoTorneo, GrupoTorneoListado, Torneo } from "@/utils/types";

interface TorneoFilasAgrupadasProps {
  grupos: GrupoTorneoListado[];
  colSpan: number;
  renderFila: (torneo: Torneo, enGrupo: boolean) => ReactNode;
  onSumar?: (grupo: GrupoTorneoListado) => void;
  /** En pantallas chicas cada torneo es una tarjeta, no una fila de tabla. */
  presentacion?: "tabla" | "tarjetas";
}

const PRIORIDAD_ESTADO: EstadoTorneo[] = [
  "En curso",
  "Inscripción",
  "Programado",
  "Cerrado",
  "Borrador",
  "Finalizado",
];

function etiquetaCorta(etiqueta: string): string {
  return etiqueta.replace(/^Categorías\s+/i, "");
}

function tonoEstado(estado: string): string {
  switch (estado) {
    case "Inscripción":
      return "text-[#00ff88]";
    case "Programado":
      return "text-violet-400";
    case "En curso":
      return "text-[#ffb800]";
    case "Finalizado":
      return "text-blue-400";
    default:
      return "text-gray-400";
  }
}

function puntoEstado(estado: string): string {
  switch (estado) {
    case "Inscripción":
      return "bg-[#00ff88]";
    case "Programado":
      return "bg-violet-500";
    case "En curso":
      return "bg-[#ffb800]";
    case "Finalizado":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

function resumenEstado(torneos: Torneo[]): { etiqueta: string; estado: string } {
  const estados = [
    ...new Set(torneos.map((torneo) => torneo.estado || "Borrador")),
  ];
  if (estados.length === 1) {
    return { etiqueta: estados[0], estado: estados[0] };
  }
  const principal =
    PRIORIDAD_ESTADO.find((estado) => estados.includes(estado)) || estados[0];
  return { etiqueta: "Varios estados", estado: principal };
}

export default function TorneoFilasAgrupadas({
  grupos,
  colSpan,
  renderFila,
  onSumar,
  presentacion = "tabla",
}: TorneoFilasAgrupadasProps) {
  const [competenciasAbiertas, setCompetenciasAbiertas] = useState<
    Record<string, boolean>
  >({});
  const [ramasAbiertas, setRamasAbiertas] = useState<Record<string, boolean>>(
    {},
  );

  if (presentacion === "tarjetas") {
    return (
      <div className="flex flex-col gap-3">
        {grupos.map((grupo, index) => {
          const clave = grupo.id || grupo.nombre || `grupo-${index}`;
          if (!grupo.nombre) {
            return (
              <Fragment key={clave}>
                {grupo.ramas.flatMap((rama) =>
                  rama.torneos.map((torneo) => (
                    <Fragment key={torneo.id}>{renderFila(torneo, false)}</Fragment>
                  )),
                )}
              </Fragment>
            );
          }

          const torneos = grupo.ramas.flatMap((rama) => rama.torneos);
          const abierta = Boolean(competenciasAbiertas[clave]);
          const categorias = torneos.length;
          const estado = resumenEstado(torneos);

          return (
            <div key={clave} className="overflow-hidden rounded-2xl border border-white/10">
              <div className="flex items-stretch border-l-[3px] border-brand-chartreuse bg-brand-chartreuse/10">
                <button
                  type="button"
                  aria-expanded={abierta}
                  aria-label={`${abierta ? "Cerrar" : "Abrir"} ${grupo.nombre}`}
                  onClick={() =>
                    setCompetenciasAbiertas((actual) => ({
                      ...actual,
                      [clave]: !actual[clave],
                    }))
                  }
                  className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
                >
                  <ChevronRight
                    className={`size-4 shrink-0 text-brand-chartreuse transition-transform ${
                      abierta ? "rotate-90" : ""
                    }`}
                  />
                  <span className="font-bold text-white">{grupo.nombre}</span>
                  <span className="text-xs font-medium text-gray-500">
                    {categorias} {categorias === 1 ? "categoría" : "categorías"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold ${tonoEstado(estado.estado)}`}
                  >
                    <span className={`size-1.5 rounded-full ${puntoEstado(estado.estado)}`} />
                    {estado.etiqueta}
                  </span>
                </button>
                {onSumar && (
                  <button
                    type="button"
                    onClick={() => onSumar(grupo)}
                    aria-label="Sumar torneos"
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-3 text-xs font-bold text-brand-chartreuse"
                  >
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline">Sumar torneos</span>
                  </button>
                )}
              </div>
              {abierta && (
                <div className="flex flex-col gap-2 p-3">
                  {grupo.ramas.map((rama) => {
                    const claveRama = `${clave}:${rama.rama || "sin"}`;
                    const ramaAbierta = Boolean(ramasAbiertas[claveRama]);
                    const nombreRama = etiquetaCorta(rama.etiqueta) || "Sin rama";
                    return (
                      <div key={claveRama}>
                        <button
                          type="button"
                          aria-expanded={ramaAbierta}
                          aria-label={`${ramaAbierta ? "Cerrar" : "Abrir"} ${nombreRama} de ${grupo.nombre}`}
                          onClick={() =>
                            setRamasAbiertas((actual) => ({
                              ...actual,
                              [claveRama]: !actual[claveRama],
                            }))
                          }
                          className="flex w-full cursor-pointer items-center gap-2 py-1.5 text-left"
                        >
                          <ChevronRight
                            className={`size-3.5 shrink-0 text-gray-400 transition-transform ${
                              ramaAbierta ? "rotate-90" : ""
                            }`}
                          />
                          <span className="text-sm font-semibold text-white">{nombreRama}</span>
                          <span className="text-xs font-medium text-gray-500">
                            {rama.torneos.length}{" "}
                            {rama.torneos.length === 1 ? "categoría" : "categorías"}
                          </span>
                        </button>
                        {ramaAbierta && (
                          <div className="mt-2 flex flex-col gap-2">
                            {rama.torneos.map((torneo) => (
                              <Fragment key={torneo.id}>{renderFila(torneo, true)}</Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {grupos.map((grupo, index) => {
        const clave = grupo.id || grupo.nombre || `grupo-${index}`;
        if (!grupo.nombre) {
          return (
            <Fragment key={clave}>
              {grupo.ramas.flatMap((rama) =>
                rama.torneos.map((torneo) => (
                  <Fragment key={torneo.id}>{renderFila(torneo, false)}</Fragment>
                )),
              )}
            </Fragment>
          );
        }

        const torneos = grupo.ramas.flatMap((rama) => rama.torneos);
        const abierta = Boolean(competenciasAbiertas[clave]);
        const categorias = torneos.length;
        const estado = resumenEstado(torneos);

        return (
          <Fragment key={clave}>
            <tr>
              <td colSpan={colSpan} className="p-0">
                <div className="flex items-stretch border-l-[3px] border-brand-chartreuse bg-brand-chartreuse/10">
                  <button
                    type="button"
                    aria-expanded={abierta}
                    aria-label={`${abierta ? "Cerrar" : "Abrir"} ${grupo.nombre}`}
                    onClick={() =>
                      setCompetenciasAbiertas((actual) => ({
                        ...actual,
                        [clave]: !actual[clave],
                      }))
                    }
                    className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-left hover:bg-brand-chartreuse/10"
                  >
                    <ChevronRight
                      className={`size-4 shrink-0 text-brand-chartreuse transition-transform ${
                        abierta ? "rotate-90" : ""
                      }`}
                    />
                    <span className="font-bold text-white">{grupo.nombre}</span>
                    <span className="text-xs font-medium text-gray-500">
                      {categorias} {categorias === 1 ? "categoría" : "categorías"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${tonoEstado(estado.estado)}`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${puntoEstado(estado.estado)}`}
                      />
                      {estado.etiqueta}
                    </span>
                  </button>
                  {onSumar && (
                    <button
                      type="button"
                      onClick={() => onSumar(grupo)}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-4 text-xs font-bold text-brand-chartreuse hover:bg-brand-chartreuse/15"
                    >
                      <Plus className="size-3.5" />
                      Sumar torneos
                    </button>
                  )}
                </div>
              </td>
            </tr>
            {abierta &&
              grupo.ramas.map((rama) => {
                const claveRama = `${clave}:${rama.rama || "sin"}`;
                const ramaAbierta = Boolean(ramasAbiertas[claveRama]);
                const nombreRama = etiquetaCorta(rama.etiqueta) || "Sin rama";
                return (
                  <Fragment key={claveRama}>
                    <tr>
                      <td colSpan={colSpan} className="p-0">
                        <button
                          type="button"
                          aria-expanded={ramaAbierta}
                          aria-label={`${ramaAbierta ? "Cerrar" : "Abrir"} ${nombreRama} de ${grupo.nombre}`}
                          onClick={() =>
                            setRamasAbiertas((actual) => ({
                              ...actual,
                              [claveRama]: !actual[claveRama],
                            }))
                          }
                          className="flex w-full cursor-pointer items-center gap-3 border-l-[3px] border-brand-chartreuse/40 bg-white/[0.03] py-2 pr-5 pl-10 text-left hover:bg-white/[0.05]"
                        >
                          <ChevronRight
                            className={`size-3.5 shrink-0 text-gray-400 transition-transform ${
                              ramaAbierta ? "rotate-90" : ""
                            }`}
                          />
                          <span className="text-sm font-semibold text-white">
                            {nombreRama}
                          </span>
                          <span className="text-xs font-medium text-gray-500">
                            {rama.torneos.length}{" "}
                            {rama.torneos.length === 1 ? "categoría" : "categorías"}
                          </span>
                        </button>
                      </td>
                    </tr>
                    {ramaAbierta &&
                      rama.torneos.map((torneo) => (
                        <Fragment key={torneo.id}>
                          {renderFila(torneo, true)}
                        </Fragment>
                      ))}
                  </Fragment>
                );
              })}
          </Fragment>
        );
      })}
    </>
  );
}
