import { supabaseAdmin } from "../config/supabase";
import { ClasificacionService } from "../services/clasificacion.service";
import { clasificadosPorZona, partidoZonaPendiente } from "./clasificacionZonas";
import {
  getFapBracketForPairCount,
  listLeafSeeds,
} from "./fapBracketMatrices";
import {
  buildQualifiedMap,
  fillLeafSidesFromQualified,
} from "./fapBracketPlacement";
import type { QualifiedPair } from "./fapBracketTypes";

/** @deprecated Prefer matriz FAP por cantidad de parejas. */
export function getPlayoffSize(zonasCount: number): number {
  if (zonasCount <= 1) return 2;
  if (zonasCount === 2 || zonasCount === 3) return 4;
  if (zonasCount >= 4 && zonasCount <= 6) return 8;
  if (zonasCount >= 7 && zonasCount <= 12) return 16;
  return 32;
}

export function getPrimeraRondaPlayoff(playoffSize: number): string {
  if (playoffSize === 4) return "SEMIS";
  if (playoffSize === 8) return "CUARTOS";
  if (playoffSize === 16) return "OCTAVOS";
  if (playoffSize === 32) return "PRELIMINARES";
  return "FINAL";
}

const PLAYOFF_RONDAS = [
  "PRELIMINARES",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "FINAL",
  "LLAVE",
] as const;


export async function avanzarPartidosInternosZonaCuatro(
  torneoId: string,
  nombreZona: string,
): Promise<void> {
  const { data: groupMatches } = await supabaseAdmin
    .from("partidos")
    .select("id, ronda, ganador, equipo_a_id, equipo_b_id, orden")
    .eq("torneo_id", torneoId)
    .eq("ronda", nombreZona)
    .order("orden", { ascending: true });

  if (!groupMatches || groupMatches.length !== 4) return;

  const p1 = groupMatches.find((m) => m.orden === 1);
  const p2 = groupMatches.find((m) => m.orden === 2);
  const p3 = groupMatches.find((m) => m.orden === 3);
  const p4 = groupMatches.find((m) => m.orden === 4);

  if (!p1 || !p2 || !p3 || !p4) return;
  if (!p1.ganador || !p2.ganador) return;

  const p3NeedsTeams = !p3.equipo_a_id || !p3.equipo_b_id;
  const p4NeedsTeams = !p4.equipo_a_id || !p4.equipo_b_id;

  if (p3NeedsTeams || p4NeedsTeams) {
    const g1 = p1.ganador;
    const g2 = p2.ganador;
    const perdedor1 =
      p1.ganador === p1.equipo_a_id ? p1.equipo_b_id : p1.equipo_a_id;
    const perdedor2 =
      p2.ganador === p2.equipo_a_id ? p2.equipo_b_id : p2.equipo_a_id;

    if (!g1 || !g2 || !perdedor1 || !perdedor2) return;

    if (p3NeedsTeams) {
      await supabaseAdmin
        .from("partidos")
        .update({
          equipo_a_id: g1,
          equipo_b_id: g2,
          estado_partido: "Programado",
        })
        .eq("id", p3.id);
    }

    if (p4NeedsTeams) {
      await supabaseAdmin
        .from("partidos")
        .update({
          equipo_a_id: perdedor1,
          equipo_b_id: perdedor2,
          estado_partido: "Programado",
        })
        .eq("id", p4.id);
    }
  }

  // Completar cancha/hora si faltan (torneos previos o TBD sin slot).
  const { programarPartidosZonaPendientes } = await import(
    "./programacionPartidos"
  );
  await programarPartidosZonaPendientes(torneoId, nombreZona);
}

export async function avanzarPartidosInternosTodasLasZonasCuatro(
  torneoId: string,
): Promise<void> {
  const { data: zoneRounds } = await supabaseAdmin
    .from("partidos")
    .select("ronda")
    .eq("torneo_id", torneoId)
    .ilike("ronda", "Zona %");

  const uniqueRounds = [
    ...new Set((zoneRounds || []).map((z) => z.ronda).filter(Boolean)),
  ];

  for (const ronda of uniqueRounds) {
    await avanzarPartidosInternosZonaCuatro(torneoId, ronda);
  }
}

export async function zonasGrupalesCompletas(
  torneoId: string,
): Promise<boolean> {
  const { data: allGroupMatches } = await supabaseAdmin
    .from("partidos")
    .select("id, ronda, ganador, equipo_a_id, equipo_b_id")
    .eq("torneo_id", torneoId)
    .ilike("ronda", "Zona %");

  if (!allGroupMatches || allGroupMatches.length === 0) return false;

  return (
    allGroupMatches.filter((p) => partidoZonaPendiente(p)).length === 0
  );
}

export async function avanzarJugadoresALlaves(torneoId: string): Promise<void> {
  const { data: grupos } = await supabaseAdmin
    .from("grupos")
    .select("id, nombre_grupo, grupo_parejas(inscripcion_id)")
    .eq("torneo_id", torneoId)
    .order("nombre_grupo");

  if (!grupos || grupos.length === 0) return;

  const { count: pairCount } = await supabaseAdmin
    .from("inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("torneo_id", torneoId)
    .eq("estado_pago", "Confirmado");

  const nParejas = pairCount ?? 0;
  const matrix = getFapBracketForPairCount(nParejas);
  if (!matrix) {
    console.error(
      `[playoffAvance] Sin matriz FAP para ${nParejas} parejas (torneo ${torneoId})`,
    );
    return;
  }

  const qualifiedPairs: QualifiedPair[] = [];

  for (const g of grupos) {
    const parejasEnZona = g.grupo_parejas?.length || 0;
    if (parejasEnZona === 0) continue;

    const cupo = clasificadosPorZona(parejasEnZona);
    const tabla = await ClasificacionService.calcularPosicionesZona(
      torneoId,
      g.nombre_grupo,
      parejasEnZona,
    );

    const zoneLetter = g.nombre_grupo.replace(/^Zona\s+/i, "").trim().toUpperCase();

    for (let pos = 0; pos < cupo; pos++) {
      const row = tabla[pos];
      if (!row) continue;
      qualifiedPairs.push({
        pairId: row.inscripcionId,
        zone: zoneLetter,
        qualificationPosition: (pos + 1) as 1 | 2 | 3,
        rankingScore: row.puntosTotales,
      });
    }
  }

  const qualifiedMap = buildQualifiedMap(qualifiedPairs);
  const requiredSeeds = listLeafSeeds(matrix);
  const missing = requiredSeeds.filter((s) => !qualifiedMap.has(s));
  if (missing.length > 0) {
    console.warn(
      `[playoffAvance] Faltan clasificados para slots FAP ${missing.join(", ")} (torneo ${torneoId})`,
    );
  }

  const { data: playoffMatches } = await supabaseAdmin
    .from("partidos")
    .select("id, orden, equipo_a_id, equipo_b_id, ronda")
    .eq("torneo_id", torneoId)
    .in("ronda", [...PLAYOFF_RONDAS])
    .order("orden", { ascending: true });

  if (!playoffMatches || playoffMatches.length === 0) return;

  const byOrden = new Map(playoffMatches.map((p) => [p.orden, p]));
  const fills = fillLeafSidesFromQualified(matrix, qualifiedMap);

  for (const fill of fills) {
    const partido = byOrden.get(fill.matchNo);
    if (!partido) continue;

    const matrixMatch = matrix.find((m) => m.matchNo === fill.matchNo);
    if (!matrixMatch) continue;

    const equipo_a_id = matrixMatch.a.startsWith("W")
      ? partido.equipo_a_id
      : fill.equipo_a_id;
    const equipo_b_id = matrixMatch.b.startsWith("W")
      ? partido.equipo_b_id
      : fill.equipo_b_id;

    if (
      equipo_a_id === partido.equipo_a_id &&
      equipo_b_id === partido.equipo_b_id
    ) {
      continue;
    }

    await supabaseAdmin
      .from("partidos")
      .update({
        equipo_a_id,
        equipo_b_id,
        estado_partido: "Programado",
      })
      .eq("id", partido.id);
  }

  const { programarPartidosLlavePendientes } = await import(
    "./programacionPartidos"
  );
  await programarPartidosLlavePendientes(torneoId);
}

export async function sincronizarClasificadosALlave(
  torneoId: string,
): Promise<boolean> {
  await avanzarPartidosInternosTodasLasZonasCuatro(torneoId);

  const zonasCompletas = await zonasGrupalesCompletas(torneoId);
  if (!zonasCompletas) return false;

  const { data: playoffMatches } = await supabaseAdmin
    .from("partidos")
    .select("id, equipo_a_id, equipo_b_id, orden, ronda")
    .eq("torneo_id", torneoId)
    .in("ronda", [...PLAYOFF_RONDAS])
    .order("orden", { ascending: true });

  if (!playoffMatches || playoffMatches.length === 0) return false;

  // Si ya hay alguna hoja rellena, igual re-sincronizamos con FAP (idempotente en lados W*).
  await avanzarJugadoresALlaves(torneoId);
  return true;
}
