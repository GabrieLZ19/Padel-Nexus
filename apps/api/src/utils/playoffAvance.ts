import { supabaseAdmin } from "../config/supabase";
import { ClasificacionService } from "../services/clasificacion.service";
import { clasificadosPorZona, partidoZonaPendiente } from "./clasificacionZonas";
import {
  getFapBracketForPairCount,
  listLeafSeeds,
} from "./fapBracketMatrices";
import {
  buildQualifiedMap,
  proyectarSincronizacionHojasFap,
} from "./fapBracketPlacement";
import type { QualifiedPair } from "./fapBracketTypes";
import {
  buildZonePairCountsByLetter,
  listSemillasPendientesFap,
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

type PartidoZonaMin = {
  ronda?: string | null;
  ganador?: string | null;
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
};

export function zonaFixtureCompleto(matches: PartidoZonaMin[]): boolean {
  if (matches.length === 0) return false;
  return matches.every((p) => !partidoZonaPendiente(p));
}

/** Mapa nombre de zona -> todas sus partidas de zona están jugados. */
export async function mapZonasGrupalesCompletas(
  torneoId: string,
): Promise<Map<string, boolean>> {
  const { data: allGroupMatches } = await supabaseAdmin
    .from("partidos")
    .select("id, ronda, ganador, equipo_a_id, equipo_b_id")
    .eq("torneo_id", torneoId)
    .ilike("ronda", "Zona %");

  const byRonda = new Map<string, PartidoZonaMin[]>();
  for (const p of allGroupMatches || []) {
    const ronda = (p.ronda || "").trim();
    if (!ronda) continue;
    const list = byRonda.get(ronda) ?? [];
    list.push(p);
    byRonda.set(ronda, list);
  }

  const out = new Map<string, boolean>();
  for (const [ronda, matches] of byRonda) {
    out.set(ronda, zonaFixtureCompleto(matches));
  }
  return out;
}

export async function zonasGrupalesCompletas(
  torneoId: string,
): Promise<boolean> {
  const byZona = await mapZonasGrupalesCompletas(torneoId);
  if (byZona.size === 0) return false;
  return [...byZona.values()].every(Boolean);
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

export type OpcionesAvanzarJugadoresALlave = {
  /** Si false, no asigna horarios de llave (p. ej. tras guardar zonas). */
  programarLlavePendiente?: boolean;
  /** Si false, no fuerza estado_partido Programado al rellenar lados. */
  marcarPartidosProgramados?: boolean;
};

export async function avanzarJugadoresALlaves(
  torneoId: string,
  opciones: OpcionesAvanzarJugadoresALlave = {},
): Promise<ResumenSincLlaveFap> {
  const programarLlave = opciones.programarLlavePendiente !== false;
  const marcarProgramados = opciones.marcarPartidosProgramados !== false;

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
  const zonasCompletas = await mapZonasGrupalesCompletas(torneoId);

  for (const g of grupos) {
    const parejasEnZona = g.grupo_parejas?.length || 0;
    if (parejasEnZona === 0) continue;

    if (!zonasCompletas.get(g.nombre_grupo)) {
      continue;
    }

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
  const countsByZone = buildZonePairCountsByLetter(grupos);
  const missing = listSemillasPendientesFap(
    requiredSeeds,
    qualifiedMap,
    countsByZone,
  );
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

  const proyeccion = proyectarSincronizacionHojasFap(
    matrix,
    countsByZone,
    qualifiedMap,
  playoffMatches.map((p) => ({
      orden: Number(p.orden),
      equipo_a_id: p.equipo_a_id,
      equipo_b_id: p.equipo_b_id,
    })),
  );
  const byOrden = new Map(playoffMatches.map((p) => [p.orden, p]));
  const semillasInvalidadas = proyeccion.semillas_invalidadas;
  const semillasActualizadas = proyeccion.semillas_actualizadas;

  for (const upd of proyeccion.actualizaciones) {
    const partido = byOrden.get(upd.matchNo);
    if (!partido) continue;
    if (
      partido.ganador ||
      String(partido.estado_partido || "").toUpperCase() === "FINALIZADO"
    ) {
      continue;
    }

    const patch: Record<string, unknown> = {
      equipo_a_id: upd.equipo_a_id,
      equipo_b_id: upd.equipo_b_id,
    };
    if (
      marcarProgramados &&
      !partido.ganador &&
      partido.estado_partido !== "Finalizado" &&
      upd.equipo_a_id &&
      upd.equipo_b_id
    ) {
      patch.estado_partido = "Programado";
    }

    await supabaseAdmin
      .from("partidos")
      .update(patch)
      .eq("id", partido.id);
  }

  if (programarLlave) {
    const { programarPartidosLlavePendientes } = await import(
      "./programacionPartidos"
    );
    await programarPartidosLlavePendientes(torneoId);
  }

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
  await avanzarJugadoresALlaves(torneoId, {
    programarLlavePendiente: true,
    marcarPartidosProgramados: true,
  });
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

  return avanzarJugadoresALlaves(torneoId, {
    programarLlavePendiente: false,
    marcarPartidosProgramados: false,
  });
}
