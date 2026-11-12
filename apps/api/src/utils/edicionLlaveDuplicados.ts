import { supabaseAdmin } from "../config/supabase";
import {
  limpiarSlot,
  reemplazarParejaEnLado,
  type LadoLlave,
  type PartidoEditable,
} from "./edicionLlaveMenores";

export const RONDAS_PLAYOFF_LLAVE = [
  "32AVOS",
  "16AVOS",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "FINAL",
] as const;

export class LlaveConflictoError extends Error {
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = "LlaveConflictoError";
  }
}

type FilaPartidoLlave = {
  id: string;
  ronda: string;
  orden: number | null;
  equipo_a_id: string | null;
  equipo_b_id: string | null;
  ganador: string | null;
  set1_a: number | null;
  set1_b: number | null;
};

function ladoDePareja(
  fila: FilaPartidoLlave,
  inscripcionId: string,
): LadoLlave | null {
  if (fila.equipo_a_id === inscripcionId) return "a";
  if (fila.equipo_b_id === inscripcionId) return "b";
  return null;
}

function aPartidoEditable(fila: FilaPartidoLlave): PartidoEditable {
  return {
    id: fila.id,
    ronda: fila.ronda,
    orden: fila.orden ?? 0,
    equipoAId: fila.equipo_a_id,
    equipoBId: fila.equipo_b_id,
    ganador: fila.ganador,
    set1A: fila.set1_a,
    set1B: fila.set1_b,
  };
}

/**
 * Antes de asignar una pareja a otro cruce, la libera del slot pendiente donde
 * ya figuraba (no destructivo: no toca partidos con resultado real).
 */
export async function liberarParejasDuplicadasEnLlave(
  torneoId: string,
  partidoId: string,
  prevA: string | null,
  prevB: string | null,
  nextA: string | null,
  nextB: string | null,
): Promise<string[]> {
  const cambios: { prev: string | null; next: string | null }[] = [
    { prev: prevA, next: nextA },
    { prev: prevB, next: nextB },
  ];

  const hayTraslado = cambios.some(
    (c) => c.next && c.next !== c.prev,
  );
  if (!hayTraslado) return [];

  const { data: matches, error } = await supabaseAdmin
    .from("partidos")
    .select(
      "id, ronda, orden, equipo_a_id, equipo_b_id, ganador, set1_a, set1_b",
    )
    .eq("torneo_id", torneoId)
    .in("ronda", [...RONDAS_PLAYOFF_LLAVE]);

  if (error) throw new Error(error.message);

  const filas = (matches || []) as FilaPartidoLlave[];
  const afectados: string[] = [];
  const intercambiados = new Set<string>();

  const persistirParche = async (
    filaId: string,
    parche: ReturnType<typeof limpiarSlot>,
  ) => {
    const { error: updErr } = await supabaseAdmin
      .from("partidos")
      .update({
        equipo_a_id: parche.equipoAId,
        equipo_b_id: parche.equipoBId,
        ganador: parche.ganador,
        set1_a: parche.set1A,
        set1_b: parche.set1B,
        estado_partido: parche.estado,
      })
      .eq("id", filaId);
    if (updErr) throw new Error(updErr.message);
    afectados.push(filaId);
  };

  for (const { prev, next } of cambios) {
    if (!next || next === prev) continue;
    if (intercambiados.has(next)) continue;

    let origen: FilaPartidoLlave | undefined;
    let ladoOrigen: LadoLlave | null = null;
    for (const fila of filas) {
      if (fila.id === partidoId) continue;
      const lado = ladoDePareja(fila, next);
      if (lado) {
        origen = fila;
        ladoOrigen = lado;
        break;
      }
    }

    if (origen && ladoOrigen && prev) {
      try {
        const parche = reemplazarParejaEnLado(
          aPartidoEditable(origen),
          ladoOrigen,
          prev,
        );
        await persistirParche(origen.id, parche);
        intercambiados.add(next);
        continue;
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "La pareja ya jugó un partido de la llave.";
        throw new LlaveConflictoError(msg);
      }
    }

    for (const fila of filas) {
      if (fila.id === partidoId) continue;
      if (origen && fila.id === origen.id && intercambiados.has(next)) {
        continue;
      }
      const lado = ladoDePareja(fila, next);
      if (!lado) continue;

      let parche;
      try {
        parche = limpiarSlot(aPartidoEditable(fila), lado);
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "La pareja ya jugó un partido de la llave.";
        throw new LlaveConflictoError(msg);
      }

      await persistirParche(fila.id, parche);
    }
  }

  return [...new Set(afectados)];
}
