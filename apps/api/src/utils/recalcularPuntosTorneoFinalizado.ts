import { FAP_ESTADOS_TORNEO } from "../constants/fap";
import { supabaseAdmin } from "../config/supabase";
import {
  otorgarPuntosPorPartidoRanking,
  ordenarPartidosParaRecalculoPuntos,
  type TorneoInfoPuntos,
} from "./otorgarPuntosPartidoTorneo";
import { tablaPuntosDesdeConfig, type ConfigPuntosTorneo } from "./rankingTorneo";

export async function recalcularPuntosTorneoFinalizado(
  torneoId: string,
): Promise<number> {
  const { data: torneo, error } = await supabaseAdmin
    .from("torneos")
    .select(
      "id, estado, nivel, categoria, modalidad, alcance, configuracion_puntos, clubes!club_id ( provincia )",
    )
    .eq("id", torneoId)
    .single();

  if (error || !torneo) {
    throw new Error("Torneo no encontrado.");
  }
  if (torneo.estado !== FAP_ESTADOS_TORNEO.FINALIZADO) {
    throw new Error(
      "Solo podés recalcular puntos en torneos ya finalizados.",
    );
  }

  const config = (torneo.configuracion_puntos || {}) as ConfigPuntosTorneo;
  if (!tablaPuntosDesdeConfig(config)) {
    throw new Error(
      "La configuración de puntos del torneo no está activada.",
    );
  }

  const { count: movimientosPrevios } = await supabaseAdmin
    .from("historial_ranking")
    .select("id", { count: "exact", head: true })
    .eq("torneo_id", torneoId);

  if ((movimientosPrevios ?? 0) > 0) {
    throw new Error(
      "Este torneo ya tiene movimientos en el historial de ranking. No se puede recalcular automáticamente.",
    );
  }

  const { data: partidos } = await supabaseAdmin
    .from("partidos")
    .select(
      "id, torneo_id, ronda, orden, ganador, equipo_a_id, equipo_b_id, estado_partido",
    )
    .eq("torneo_id", torneoId)
    .not("ganador", "is", null);

  const finalizados = (partidos || []).filter((p) => {
    const est = String(p.estado_partido || "").toLowerCase();
    return est.includes("finalizado") || Boolean(p.ganador);
  });

  const torneoInfo = torneo as TorneoInfoPuntos;
  const ordenados = ordenarPartidosParaRecalculoPuntos(finalizados);

  for (const partido of ordenados) {
    if (!partido.ganador) continue;
    await otorgarPuntosPorPartidoRanking(
      {
        id: partido.id,
        torneo_id: torneoId,
        ronda: partido.ronda,
        ganador: partido.ganador,
        equipo_a_id: partido.equipo_a_id,
        equipo_b_id: partido.equipo_b_id,
      },
      torneoInfo,
      partido.ganador,
    );
  }

  return ordenados.length;
}
