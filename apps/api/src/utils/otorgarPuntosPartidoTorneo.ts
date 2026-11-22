import { supabaseAdmin } from "../config/supabase";
import {
  alcanceRankingDesdeTorneo,
  puntosInstanciaEliminatoria,
  tablaPuntosDesdeConfig,
  type ConfigPuntosTorneo,
} from "./rankingTorneo";

export type TorneoInfoPuntos = {
  nivel: string;
  categoria: string;
  modalidad?: string | null;
  alcance?: string | null;
  configuracion_puntos?: ConfigPuntosTorneo | null;
  clubes?: { provincia?: string } | null;
};

export type PartidoConGanador = {
  id: string;
  torneo_id: string;
  ronda: string;
  ganador: string;
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
};

const SECUENCIA_RONDAS = [
  "32AVOS",
  "16AVOS",
  "PRELIMINARES",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "FINAL",
] as const;

export function ordenarPartidosParaRecalculoPuntos<
  T extends { ronda?: string | null; orden?: number | null },
>(partidos: T[]): T[] {
  return [...partidos].sort((a, b) => {
    const ra = String(a.ronda || "").toUpperCase().trim();
    const rb = String(b.ronda || "").toUpperCase().trim();
    const za = ra.startsWith("ZONA");
    const zb = rb.startsWith("ZONA");
    if (za !== zb) return za ? -1 : 1;
    if (za && zb) {
      return ra.localeCompare(rb, "es") || (a.orden ?? 0) - (b.orden ?? 0);
    }
    const ia = SECUENCIA_RONDAS.indexOf(
      ra as (typeof SECUENCIA_RONDAS)[number],
    );
    const ib = SECUENCIA_RONDAS.indexOf(
      rb as (typeof SECUENCIA_RONDAS)[number],
    );
    const pa = ia >= 0 ? ia : 99;
    const pb = ib >= 0 ? ib : 99;
    return pa - pb || (a.orden ?? 0) - (b.orden ?? 0);
  });
}

/**
 * Otorga puntos de ranking por un partido finalizado según configuracion_puntos del torneo.
 */
export async function otorgarPuntosPorPartidoRanking(
  partido: PartidoConGanador,
  torneoInfo: TorneoInfoPuntos,
  ganadorId: string,
): Promise<void> {
  const configP = torneoInfo.configuracion_puntos;
  const TABLA_PUNTOS = tablaPuntosDesdeConfig(configP);
  if (!TABLA_PUNTOS) return;

  const perdedorId =
    ganadorId === partido.equipo_a_id
      ? partido.equipo_b_id ?? null
      : partido.equipo_a_id ?? null;

  const clubEmbed = torneoInfo.clubes as { provincia?: string } | null;
  const alcanceRanking = alcanceRankingDesdeTorneo(torneoInfo.alcance);
  const provinciaJurisdiccion = clubEmbed?.provincia ?? null;

  const otorgarPuntosAInscripcion = async (
    inscripcionId: string | null,
    puntos: number,
    esGanador: boolean,
    opciones?: { registrarEstadisticasSinPuntos?: boolean },
  ) => {
    if (!inscripcionId) return;
    const registrarStats =
      puntos > 0 || Boolean(opciones?.registrarEstadisticasSinPuntos);
    if (!registrarStats) return;
    const { data: ins } = await supabaseAdmin
      .from("inscripciones")
      .select("usuario_id, usuario2_id")
      .eq("id", inscripcionId)
      .single();
    if (!ins) return;

    const ids = [ins.usuario_id, ins.usuario2_id].filter(Boolean);
    for (const uid of ids) {
      const categoriaNivel = String(torneoInfo.nivel || "").trim();
      if (!categoriaNivel) continue;

      const { data: rank } = await supabaseAdmin
        .from("rankings")
        .select("id, puntos, pj, pg, alcance, provincia_jurisdiccion")
        .eq("usuario_id", uid)
        .eq("categoria", categoriaNivel)
        .maybeSingle();

      const pAnt = rank?.puntos || 0;
      const pjAnt = rank?.pj || 0;
      const pgAnt = rank?.pg || 0;

      const { error: rankError } = await supabaseAdmin.from("rankings").upsert(
        {
          ...(rank?.id ? { id: rank.id } : {}),
          usuario_id: uid,
          categoria: categoriaNivel,
          rama: torneoInfo.categoria,
          alcance: rank?.alcance ?? alcanceRanking,
          provincia_jurisdiccion:
            provinciaJurisdiccion ?? rank?.provincia_jurisdiccion ?? null,
          puntos: pAnt + Math.max(0, puntos),
          pj: pjAnt + 1,
          pg: esGanador ? pgAnt + 1 : pgAnt,
        },
        { onConflict: "usuario_id,categoria" },
      );

      if (rankError) {
        throw new Error(`Error al actualizar ranking: ${rankError.message}`);
      }

      if (puntos > 0) {
        const { error: histError } = await supabaseAdmin
          .from("historial_ranking")
          .insert([
            {
              usuario_id: uid,
              torneo_id: partido.torneo_id,
              puntos_anteriores: pAnt,
              puntos_nuevos: pAnt + puntos,
              ronda: partido.ronda ?? null,
            },
          ]);
        if (histError) {
          throw new Error(
            `Error al insertar historial de ranking: ${histError.message}`,
          );
        }
      }
    }
  };

  const rondaNormalizada = partido.ronda.toUpperCase().trim();

  if (rondaNormalizada.startsWith("ZONA")) {
    const ptsZona = Number(configP?.puntos_zona) || 0;
    if (ptsZona > 0) {
      await otorgarPuntosAInscripcion(ganadorId, ptsZona, true);
      await otorgarPuntosAInscripcion(perdedorId, ptsZona, false);
    }
    return;
  }

  const configPuntos = (configP || {}) as ConfigPuntosTorneo;
  const puntosGanador = puntosInstanciaEliminatoria(
    rondaNormalizada,
    true,
    configPuntos,
  );
  const puntosPerdedor = puntosInstanciaEliminatoria(
    rondaNormalizada,
    false,
    configPuntos,
  );

  await otorgarPuntosAInscripcion(
    perdedorId,
    puntosPerdedor,
    false,
    puntosPerdedor > 0
      ? undefined
      : { registrarEstadisticasSinPuntos: true },
  );
  await otorgarPuntosAInscripcion(
    ganadorId,
    puntosGanador,
    true,
    puntosGanador > 0
      ? undefined
      : { registrarEstadisticasSinPuntos: true },
  );
}
