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
import {
  buildZonePairCountsByLetter,
  isSeedRefValidForZoneComposition,
} from "./fapZoneSeeds";

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

  const [p1, p2, p3, p4] = groupMatches;

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

export type ResumenSincLlaveFap = {
  semillas_invalidadas: string[];
  semillas_actualizadas: string[];
  semillas_pendientes: string[];
};

const resumenVacio = (): ResumenSincLlaveFap => ({
  semillas_invalidadas: [],
  semillas_actualizadas: [],
  semillas_pendientes: [],
});

export async function avanzarJugadoresALlaves(
  torneoId: string,
): Promise<ResumenSincLlaveFap> {
  const { data: grupos } = await supabaseAdmin
    .from("grupos")
    .select("id, nombre_grupo, grupo_parejas(inscripcion_id)")
    .eq("torneo_id", torneoId)
    .order("nombre_grupo");

  if (!grupos || grupos.length === 0) return resumenVacio();

  const { resolveFapPlantillaPairCount } = await import("./fapPlantillaTorneo");
  const nParejas = await resolveFapPlantillaPairCount(torneoId);
  const matrix = getFapBracketForPairCount(nParejas);
  if (!matrix) {
    console.error(
      `[playoffAvance] Sin matriz FAP para ${nParejas} parejas (torneo ${torneoId})`,
    );
    return resumenVacio();
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

      // El sorteo solo afecta a los puestos empatados; el resto pasa a la llave apenas termina la zona
      if (row.requiereSorteo) {
        console.warn(
          `[playoffAvance] Zona ${g.nombre_grupo} puesto ${pos + 1} pendiente de sorteo reglamentario (torneo ${torneoId}). Se posterga este puesto hasta resolver sorteo.`,
        );
        continue;
      }

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
    .select("id, orden, equipo_a_id, equipo_b_id, ronda, estado_partido, ganador")
    .eq("torneo_id", torneoId)
    .in("ronda", [...PLAYOFF_RONDAS])
    .order("orden", { ascending: true });

  if (!playoffMatches || playoffMatches.length === 0) return resumenVacio();

  const countsByZone = buildZonePairCountsByLetter(grupos);
  const byOrden = new Map(playoffMatches.map((p) => [p.orden, p]));
  const fills = fillLeafSidesFromQualified(matrix, qualifiedMap);
  const semillasInvalidadas: string[] = [];
  const semillasActualizadas: string[] = [];

  for (const fill of fills) {
    const partido = byOrden.get(fill.matchNo);
    if (!partido) continue;

    const matrixMatch = matrix.find((m) => m.matchNo === fill.matchNo);
    if (!matrixMatch) continue;

    const prevA = partido.equipo_a_id;
    const prevB = partido.equipo_b_id;

    const equipo_a_id = matrixMatch.a.startsWith("W")
      ? partido.equipo_a_id
      : isSeedRefValidForZoneComposition(matrixMatch.a, countsByZone)
        ? fill.equipo_a_id
        : null;
    const equipo_b_id = matrixMatch.b.startsWith("W")
      ? partido.equipo_b_id
      : isSeedRefValidForZoneComposition(matrixMatch.b, countsByZone)
        ? fill.equipo_b_id
        : null;

    if (!matrixMatch.a.startsWith("W")) {
      if (prevA && equipo_a_id === null) {
        semillasInvalidadas.push(matrixMatch.a);
      } else if (
        prevA !== equipo_a_id &&
        equipo_a_id &&
        isSeedRefValidForZoneComposition(matrixMatch.a, countsByZone)
      ) {
        semillasActualizadas.push(matrixMatch.a);
      }
    }
    if (!matrixMatch.b.startsWith("W")) {
      if (prevB && equipo_b_id === null) {
        semillasInvalidadas.push(matrixMatch.b);
      } else if (
        prevB !== equipo_b_id &&
        equipo_b_id &&
        isSeedRefValidForZoneComposition(matrixMatch.b, countsByZone)
      ) {
        semillasActualizadas.push(matrixMatch.b);
      }
    }

    if (equipo_a_id === prevA && equipo_b_id === prevB) {
      continue;
    }

    const patch: Record<string, any> = {
      equipo_a_id,
      equipo_b_id,
    };
    if (!partido.ganador && partido.estado_partido !== "Finalizado") {
      patch.estado_partido = "Programado";
    }

    await supabaseAdmin
      .from("partidos")
      .update(patch)
      .eq("id", partido.id);
  }

  const { programarPartidosLlavePendientes } = await import(
    "./programacionPartidos"
  );
  await programarPartidosLlavePendientes(torneoId);

  return {
    semillas_invalidadas: [...new Set(semillasInvalidadas)],
    semillas_actualizadas: [...new Set(semillasActualizadas)],
    semillas_pendientes: missing,
  };
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

/**
 * Tras editar zonas: rehidrata partidos internos de zonas de 4 y
 * re-sincroniza hojas de llave con semillas aún válidas (p. ej. sin 2º en zona de 2).
 */
export async function sincronizarLlaveTrasCambioZonas(
  torneoId: string,
): Promise<ResumenSincLlaveFap> {
  await avanzarPartidosInternosTodasLasZonasCuatro(torneoId);

  const { data: playoffMatches } = await supabaseAdmin
    .from("partidos")
    .select("id")
    .eq("torneo_id", torneoId)
    .in("ronda", [...PLAYOFF_RONDAS])
    .limit(1);

  if (!playoffMatches || playoffMatches.length === 0) return resumenVacio();

  return avanzarJugadoresALlaves(torneoId);
}
