import type { Partido } from "@/utils/types";

export type ResolverEtiquetaPareja = (inscripcionId: string | null) => string;

export type ResolverNumeroPartido = (partidoId: string) => number | null;

export type MensajesTrasladoLlave = {
  avisos: string[];
  hayIntercambio: boolean;
  hayParejaFuera: boolean;
};

function ladoContrario(partido: Partido, inscripcionId: string): "a" | "b" | null {
  if (partido.equipo_a_id === inscripcionId) return "b";
  if (partido.equipo_b_id === inscripcionId) return "a";
  return null;
}

function parejaEnOtroPartido(
  partidos: Partido[],
  inscripcionId: string,
  excluirPartidoId: string,
): Partido | undefined {
  return partidos.find(
    (p) =>
      p.id !== excluirPartidoId &&
      (p.equipo_a_id === inscripcionId || p.equipo_b_id === inscripcionId),
  );
}

/**
 * TOR-16: avisos antes de guardar un cruce — intercambio automático si había
 * pareja en el lado editado, o advertencia de pareja afuera si no aplica swap.
 */
export function mensajesTrasladoParejaLlave(input: {
  equipoAId: string | null;
  equipoBId: string | null;
  partidoId: string;
  baseline: { equipo_a_id: string | null; equipo_b_id: string | null } | null;
  partidosLlave: Partido[];
  etiquetaPareja: ResolverEtiquetaPareja;
  numeroPartido: ResolverNumeroPartido;
}): MensajesTrasladoLlave {
  const avisos: string[] = [];
  let hayIntercambio = false;
  let hayParejaFuera = false;

  const numDest = input.numeroPartido(input.partidoId);
  const lados: { prev: string | null; next: string | null; slot: "A" | "B" }[] = [
    {
      prev: input.baseline?.equipo_a_id ?? null,
      next: input.equipoAId ?? null,
      slot: "A",
    },
    {
      prev: input.baseline?.equipo_b_id ?? null,
      next: input.equipoBId ?? null,
      slot: "B",
    },
  ];

  for (const { prev, next, slot } of lados) {
    if (!next || next === prev) continue;

    const origen = parejaEnOtroPartido(
      input.partidosLlave,
      next,
      input.partidoId,
    );

    if (!origen) {
      if (prev) {
        hayParejaFuera = true;
        avisos.push(
          `En el lado ${slot}, ${input.etiquetaPareja(prev)} quedará fuera de la llave: la pareja elegida no proviene de otro cruce para intercambiar.`,
        );
      }
      continue;
    }

    const numOrigen = input.numeroPartido(origen.id) ?? origen.orden ?? null;
  const ladoOrigen =
      origen.equipo_a_id === next ? "a" : origen.equipo_b_id === next ? "b" : null;
    const rivalOrigen =
      ladoOrigen === "a"
        ? origen.equipo_b_id
        : ladoOrigen === "b"
          ? origen.equipo_a_id
          : null;

    if (prev) {
      hayIntercambio = true;
      const destinoTxt =
        numOrigen != null && numDest != null
          ? `el partido #${numOrigen}`
          : "el otro cruce";
      const origenTxt =
        numOrigen != null && numDest != null
          ? `el partido #${numDest}`
          : "este cruce";
      avisos.push(
        `Intercambio en lado ${slot}: ${input.etiquetaPareja(prev)} pasará a ${destinoTxt} (donde estaba ${input.etiquetaPareja(next)}) y ${input.etiquetaPareja(next)} ocupará ${origenTxt}. Nadie queda duplicado.`,
      );
    } else {
      const rivalTxt = rivalOrigen
        ? input.etiquetaPareja(rivalOrigen)
        : null;
      const contrario = ladoContrario(origen, next);
      avisos.push(
        numOrigen != null
          ? `La pareja ${input.etiquetaPareja(next)} sale del partido #${numOrigen}. ${
              rivalTxt
                ? `Su rival (${rivalTxt}) sigue en el lado ${contrario?.toUpperCase() ?? "opuesto"} de ese cruce.`
                : "El otro lado de ese cruce quedará «Por definir»."
            } Si reemplazabas a otra pareja en este lado, elegila primero o usá «Quitar» y volvé a asignar para activar el intercambio automático.`
          : `La pareja elegida deja de figurar en otro cruce de la llave.`,
      );
    }
  }

  return { avisos, hayIntercambio, hayParejaFuera };
}
