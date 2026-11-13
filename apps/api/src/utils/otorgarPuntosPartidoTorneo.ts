import { supabaseAdmin } from "../config/supabase";
import {
  alcanceRankingDesdeTorneo,
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
  ) => {
    if (!inscripcionId || puntos <= 0) return;
    const { data: ins } = await supabaseAdmin
      .from("inscripciones")
      .select("usuario_id, usuario2_id")
      .eq("id", inscripcionId)
      .single();
    if (!ins) return;

    const ids = [ins.usuario_id, ins.usuario2_id].filter(Boolean);
    for (const uid of ids) {
      const { data: rank } = await supabaseAdmin
        .from("rankings")
        .select("id, puntos, pj, pg")
        .eq("usuario_id", uid)
        .eq("categoria", torneoInfo.nivel)
        .eq("alcance", alcanceRanking)
        .maybeSingle();

      const pAnt = rank?.puntos || 0;
      const pjAnt = rank?.pj || 0;
      const pgAnt = rank?.pg || 0;

      const { error: rankError } = await supabaseAdmin.from("rankings").upsert(
        {
          ...(rank?.id ? { id: rank.id } : {}),
          usuario_id: uid,
          categoria: torneoInfo.nivel,
          rama: torneoInfo.categoria,
          alcance: alcanceRanking,
          provincia_jurisdiccion: provinciaJurisdiccion,
          puntos: pAnt + puntos,
          pj: pjAnt + 1,
          pg: esGanador ? pgAnt + 1 : pgAnt,
        },
        { onConflict: "id" },
      );

      if (rankError) {
        throw new Error(`Error al actualizar ranking: ${rankError.message}`);
      }

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

  const puntosRonda = TABLA_PUNTOS[rondaNormalizada];
  let puntosGanadorNetos = puntosRonda?.ganador || 0;
  let puntosPerdedorNetos = puntosRonda?.perdedor || 0;

  if (puntosRonda) {
    const idxRonda = SECUENCIA_RONDAS.indexOf(
      rondaNormalizada as (typeof SECUENCIA_RONDAS)[number],
    );
    let rondaAnterior: string | null = null;

    if (idxRonda > 0) {
      for (let i = idxRonda - 1; i >= 0; i--) {
        const rondaCandidata = SECUENCIA_RONDAS[i];
        const { data: prevMatches } = await supabaseAdmin
          .from("partidos")
          .select("id")
          .eq("torneo_id", partido.torneo_id)
          .eq("ronda", rondaCandidata)
          .limit(1);

        if (prevMatches && prevMatches.length > 0) {
          rondaAnterior = rondaCandidata;
          break;
        }
      }
    }

    if (rondaAnterior) {
      const puntosRondaAnterior = TABLA_PUNTOS[rondaAnterior];
      if (puntosRondaAnterior) {
        puntosGanadorNetos = Math.max(
          0,
          puntosRonda.ganador - puntosRondaAnterior.ganador,
        );
        puntosPerdedorNetos = Math.max(
          0,
          puntosRonda.perdedor - puntosRondaAnterior.ganador,
        );
      }
    }
  }

  await otorgarPuntosAInscripcion(perdedorId, puntosPerdedorNetos, false);
  await otorgarPuntosAInscripcion(ganadorId, puntosGanadorNetos, true);
}
