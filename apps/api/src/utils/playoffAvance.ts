import { supabaseAdmin } from "../config/supabase";
import { ClasificacionService } from "../services/clasificacion.service";
import { clasificadosPorZona, partidoZonaPendiente } from "./clasificacionZonas";

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
  return "FINAL";
}


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
  if (!p3NeedsTeams && !p4NeedsTeams) return;

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

  const clasificados: Array<{
    id: string;
    points: number;
    diffSets: number;
    diffGames: number;
    gamesAFavor: number;
    gamesEnContra: number;
  }> = [];

  for (const g of grupos) {
    const parejasEnZona = g.grupo_parejas?.length || 0;
    if (parejasEnZona === 0) continue;

    const cupo = clasificadosPorZona(parejasEnZona);
    const tabla = await ClasificacionService.calcularPosicionesZona(
      torneoId,
      g.nombre_grupo,
      parejasEnZona,
    );

    clasificados.push(
      ...tabla.slice(0, cupo).map((t) => ({
        id: t.inscripcionId,
        points: t.puntosTotales,
        diffSets: t.setsAFavor - t.setsEnContra,
        diffGames: t.gamesAFavor - t.gamesEnContra,
        gamesAFavor: t.gamesAFavor,
        gamesEnContra: t.gamesEnContra,
      })),
    );
  }

  const n = grupos.length;
  const playoffSize = getPlayoffSize(n);
  const roundName = getPrimeraRondaPlayoff(playoffSize);

  const compararEquipos = (
    a: {
      points: number;
      diffSets: number;
      diffGames: number;
      gamesAFavor: number;
      gamesEnContra: number;
    },
    b: {
      points: number;
      diffSets: number;
      diffGames: number;
      gamesAFavor: number;
      gamesEnContra: number;
    },
  ) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.diffSets !== b.diffSets) return b.diffSets - a.diffSets;
    if (a.diffGames !== b.diffGames) return b.diffGames - a.diffGames;
    if (a.gamesAFavor !== b.gamesAFavor) return b.gamesAFavor - a.gamesAFavor;
    return a.gamesEnContra - b.gamesEnContra;
  };

  clasificados.sort(compararEquipos);
  const clasificadosPlayoff = clasificados.slice(0, playoffSize);

  if (clasificadosPlayoff.length < 2) return;

  const { data: playoffMatches } = await supabaseAdmin
    .from("partidos")
    .select("id, equipo_a_id, equipo_b_id")
    .eq("torneo_id", torneoId)
    .eq("ronda", roundName)
    .order("orden", { ascending: true });

  if (!playoffMatches || playoffMatches.length < playoffSize / 2) return;

  for (let k = 0; k < playoffSize / 2; k++) {
    const teamA = clasificadosPlayoff[k]?.id;
    const teamB = clasificadosPlayoff[clasificadosPlayoff.length - 1 - k]?.id;

    if (!teamA || !teamB || teamA === teamB) continue;

    await supabaseAdmin
      .from("partidos")
      .update({
        equipo_a_id: teamA,
        equipo_b_id: teamB,
        estado_partido: "Programado",
      })
      .eq("id", playoffMatches[k].id);
  }
}

export async function sincronizarClasificadosALlave(
  torneoId: string,
): Promise<boolean> {
  await avanzarPartidosInternosTodasLasZonasCuatro(torneoId);

  const zonasCompletas = await zonasGrupalesCompletas(torneoId);
  if (!zonasCompletas) return false;

  const { data: grupos } = await supabaseAdmin
    .from("grupos")
    .select("id")
    .eq("torneo_id", torneoId);

  if (!grupos || grupos.length === 0) return false;

  const playoffSize = getPlayoffSize(grupos.length);
  const roundName = getPrimeraRondaPlayoff(playoffSize);

  const { data: playoffMatches } = await supabaseAdmin
    .from("partidos")
    .select("id, equipo_a_id, equipo_b_id")
    .eq("torneo_id", torneoId)
    .eq("ronda", roundName)
    .order("orden", { ascending: true });

  if (!playoffMatches || playoffMatches.length === 0) return false;

  const primeraRondaVacia = playoffMatches.every(
    (m) => !m.equipo_a_id && !m.equipo_b_id,
  );
  if (!primeraRondaVacia) return false;

  await avanzarJugadoresALlaves(torneoId);
  return true;
}
