"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { GrupoTorneoListado, Torneo } from "@/utils/types";

interface TorneoFilasAgrupadasProps {
  grupos: GrupoTorneoListado[];
  colSpan: number;
  renderFila: (torneo: Torneo, enGrupo: boolean) => ReactNode;
  onSumar?: (grupo: GrupoTorneoListado) => void;
}

function etiquetaCorta(etiqueta: string): string {
  return etiqueta.replace(/^Categorías\s+/i, "");
}

export default function TorneoFilasAgrupadas({
  grupos,
  colSpan,
  renderFila,
  onSumar,
}: TorneoFilasAgrupadasProps) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

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
        const abierto = Boolean(abiertos[clave]);
        const categorias = torneos.length;

        return (
          <Fragment key={clave}>
            <tr>
              <td colSpan={colSpan} className="p-0">
                <div className="flex items-stretch border-l-[3px] border-brand-chartreuse bg-brand-chartreuse/10">
                  <button
                    type="button"
                    aria-expanded={abierto}
                    onClick={() =>
                      setAbiertos((actual) => ({ ...actual, [clave]: !actual[clave] }))
                    }
                    className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2 text-left hover:bg-brand-chartreuse/10"
                  >
                    <ChevronRight
                      className={`size-4 shrink-0 text-brand-chartreuse transition-transform ${
                        abierto ? "rotate-90" : ""
                      }`}
                    />
                    <span className="font-bold text-white">{grupo.nombre}</span>
                    <span className="text-xs font-medium text-gray-500">
                      {categorias} {categorias === 1 ? "categoría" : "categorías"}
                    </span>
                    {grupo.ramas.map((rama) => (
                      <span
                        key={`${clave}-${rama.rama || "sin"}`}
                        className="rounded-full bg-brand-chartreuse/15 px-2 py-0.5 text-[11px] font-semibold text-brand-chartreuse"
                      >
                        {etiquetaCorta(rama.etiqueta)} {rama.torneos.length}
                      </span>
                    ))}
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
            {abierto &&
              torneos.map((torneo) => (
                <Fragment key={torneo.id}>{renderFila(torneo, true)}</Fragment>
              ))}
          </Fragment>
        );
      })}
    </>
  );
}
