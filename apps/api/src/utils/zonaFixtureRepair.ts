import { supabaseAdmin } from "../config/supabase";
import {
  aplicarHorarioConservado,
  horariosPorCruce,
} from "./horariosZona";
import {
  buildOcupadosDesdePartidos,
  programarPartidosConDisponibilidad,
  type PartidoProgramable,
} from "./programacionPartidos";

type ParejaGrupo = { inscripcion_id: string; seed: number | null };

export function pairKeyPartidoZona(
  a: string | null | undefined,
  b: string | null | undefined,
): string {
  if (!a || !b) return "";
  return [a, b].sort().join("|");
}

export type PartidoZonaExistente = {
  id: string;
  orden?: number | null;
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
  ganador?: string | null;
  estado_partido?: string | null;
  cancha_asignada?: string | null;
  fecha_partido?: string | null;
};

/**
 * TOR-38: si hay dos cruces pendientes entre las mismas parejas (p. ej. orden global 8-13
 * y reparación que agrega orden 1-3), conserva uno y devuelve ids a borrar.
 */
export function idsPartidosDuplicadosPendientes(
  existentes: PartidoZonaExistente[],
): string[] {
  const aEliminar = new Set<string>();

  const porPar = new Map<string, PartidoZonaExistente[]>();
  for (const m of existentes) {
    const pk = pairKeyPartidoZona(m.equipo_a_id, m.equipo_b_id);
    if (!pk) continue;
    const lista = porPar.get(pk) ?? [];
    lista.push(m);
    porPar.set(pk, lista);
  }
  for (const lista of porPar.values()) {
    if (lista.length <= 1) continue;
    const sorted = [...lista].sort((a, b) => {
      if (a.ganador && !b.ganador) return -1;
      if (b.ganador && !a.ganador) return 1;
      const aConHorario =
        a.cancha_asignada && a.fecha_partido ? 0 : 1;
      const bConHorario =
        b.cancha_asignada && b.fecha_partido ? 0 : 1;
      if (aConHorario !== bConHorario) return aConHorario - bConHorario;
      return (a.orden ?? 99_999) - (b.orden ?? 99_999);
    });
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].ganador) continue;
      aEliminar.add(sorted[i].id);
    }
  }

  const pendientesInternos = existentes.filter(
    (m) =>
      !m.ganador &&
      !m.equipo_a_id &&
      !m.equipo_b_id &&
      String(m.estado_partido || "").includes("Pendiente"),
  );
  const porEstado = new Map<string, PartidoZonaExistente[]>();
  for (const m of pendientesInternos) {
    const key = String(m.estado_partido);
    const lista = porEstado.get(key) ?? [];
    lista.push(m);
    porEstado.set(key, lista);
  }
  for (const lista of porEstado.values()) {
    if (lista.length <= 1) continue;
    const sorted = [...lista].sort(
      (a, b) => (a.orden ?? 99_999) - (b.orden ?? 99_999),
    );
    for (let i = 1; i < sorted.length; i++) {
      aEliminar.add(sorted[i].id);
    }
  }

  return [...aEliminar];
}

export async function deduplicarPartidosPendientesDeGrupo(
  torneoId: string,
  nombreGrupo: string,
): Promise<number> {
  const { data: existentes, error } = await supabaseAdmin
    .from("partidos")
    .select(
      "id, orden, equipo_a_id, equipo_b_id, ganador, estado_partido, cancha_asignada, fecha_partido",
    )
    .eq("torneo_id", torneoId)
    .eq("ronda", nombreGrupo);

  if (error) throw new Error(error.message);
  const ids = idsPartidosDuplicadosPendientes(
    (existentes || []) as PartidoZonaExistente[],
  );
  if (ids.length === 0) return 0;

  const { error: delErr } = await supabaseAdmin
    .from("partidos")
    .delete()
    .in("id", ids);
  if (delErr) throw new Error(delErr.message);
  return ids.length;
}

export async function deduplicarPartidosPendientesTorneo(
  torneoId: string,
): Promise<number> {
  const { data: grupos, error } = await supabaseAdmin
    .from("grupos")
    .select("nombre_grupo")
    .eq("torneo_id", torneoId);

  if (error) throw new Error(error.message);
  let total = 0;
  for (const g of grupos || []) {
    total += await deduplicarPartidosPendientesDeGrupo(
      torneoId,
      g.nombre_grupo,
    );
  }
  return total;
}

/**
 * Agrega partidos de zona que faltan sin borrar pendientes ni resultados ya jugados.
 */
export async function completarPartidosFaltantesDeGrupo(
  torneoId: string,
  grupoId: string,
  nombreGrupo: string,
): Promise<{ insertados: number; ordenes: number[] }> {
  await deduplicarPartidosPendientesDeGrupo(torneoId, nombreGrupo);

  const { data: parejas } = await supabaseAdmin
    .from("grupo_parejas")
    .select("inscripcion_id, seed")
    .eq("grupo_id", grupoId)
    .order("seed", { ascending: true });

  if (!parejas || parejas.length < 2) {
    return { insertados: 0, ordenes: [] };
  }

  const list = parejas as ParejaGrupo[];

  const { data: existentes } = await supabaseAdmin
    .from("partidos")
    .select("id, orden, equipo_a_id, equipo_b_id, ganador")
    .eq("torneo_id", torneoId)
    .eq("ronda", nombreGrupo);

  const ordenesPresentes = new Set(
    (existentes || [])
      .map((m) => m.orden)
      .filter((n): n is number => n != null),
  );

  const pairsPresentes = new Set(
    (existentes || [])
      .map((m) => pairKeyPartidoZona(m.equipo_a_id, m.equipo_b_id))
      .filter(Boolean),
  );

  const jugados = (existentes || []).filter((m) => m.ganador);
  const pairsJugados = new Set(
    jugados
      .map((m) => pairKeyPartidoZona(m.equipo_a_id, m.equipo_b_id))
      .filter(Boolean),
  );

  const horariosPrevios = horariosPorCruce(
    (existentes || []).map((m) => ({
      equipoAId: m.equipo_a_id,
      equipoBId: m.equipo_b_id,
      cancha: null,
      fecha: null,
    })),
  );

  const faltantes: PartidoProgramable[] = [];
  const pushIfNew = (orden: number, aId: string, bId: string) => {
    const pk = pairKeyPartidoZona(aId, bId);
    if (pk && pairsPresentes.has(pk)) return;
    if (ordenesPresentes.has(orden)) return;
    if (pairsJugados.has(pk)) return;
    faltantes.push({
      torneo_id: torneoId,
      ronda: nombreGrupo,
      orden,
      equipo_a_id: aId,
      equipo_b_id: bId,
      estado_partido: "Programado",
    });
    if (pk) pairsPresentes.add(pk);
  };

  if (list.length === 3) {
    pushIfNew(1, list[0].inscripcion_id, list[1].inscripcion_id);
    pushIfNew(2, list[1].inscripcion_id, list[2].inscripcion_id);
    pushIfNew(3, list[0].inscripcion_id, list[2].inscripcion_id);
  } else if (list.length === 4) {
    pushIfNew(1, list[0].inscripcion_id, list[3].inscripcion_id);
    pushIfNew(2, list[1].inscripcion_id, list[2].inscripcion_id);
    if (!ordenesPresentes.has(3)) {
      faltantes.push({
        torneo_id: torneoId,
        ronda: nombreGrupo,
        orden: 3,
        estado_partido: "Pendiente Ganadores",
      });
    }
    if (!ordenesPresentes.has(4)) {
      faltantes.push({
        torneo_id: torneoId,
        ronda: nombreGrupo,
        orden: 4,
        estado_partido: "Pendiente Perdedores",
      });
    }
  } else if (list.length === 2) {
    pushIfNew(1, list[0].inscripcion_id, list[1].inscripcion_id);
  } else {
    let orden = 1;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        pushIfNew(orden, list[i].inscripcion_id, list[j].inscripcion_id);
        orden += 1;
      }
    }
  }

  if (faltantes.length === 0) {
    return { insertados: 0, ordenes: [] };
  }

  const conHorario = faltantes.map((partido) =>
    aplicarHorarioConservado(partido, horariosPrevios),
  );
  const { data: partidosProgramados } = await supabaseAdmin
    .from("partidos")
    .select("cancha_asignada, fecha_partido")
    .eq("torneo_id", torneoId);

  const ocupados = buildOcupadosDesdePartidos(partidosProgramados || []);
  await programarPartidosConDisponibilidad(torneoId, conHorario, { ocupados });
  const { error } = await supabaseAdmin.from("partidos").insert(conHorario);
  if (error) throw new Error(error.message);

  return {
    insertados: conHorario.length,
    ordenes: conHorario.map((p) => p.orden).filter((n): n is number => n != null),
  };
}

export async function completarPartidosFaltantesTorneo(
  torneoId: string,
  soloNombresGrupo?: string[],
): Promise<
  Array<{ nombre_grupo: string; insertados: number; ordenes: number[] }>
> {
  await deduplicarPartidosPendientesTorneo(torneoId);

  const { data: grupos, error } = await supabaseAdmin
    .from("grupos")
    .select("id, nombre_grupo")
    .eq("torneo_id", torneoId)
    .order("nombre_grupo");

  if (error) throw new Error(error.message);
  const out: Array<{
    nombre_grupo: string;
    insertados: number;
    ordenes: number[];
  }> = [];

  const filtro =
    soloNombresGrupo && soloNombresGrupo.length > 0
      ? new Set(soloNombresGrupo)
      : null;

  for (const g of grupos || []) {
    if (filtro && !filtro.has(g.nombre_grupo)) {
      continue;
    }
    const res = await completarPartidosFaltantesDeGrupo(
      torneoId,
      String(g.id),
      g.nombre_grupo,
    );
    if (res.insertados > 0) {
      out.push({
        nombre_grupo: g.nombre_grupo,
        insertados: res.insertados,
        ordenes: res.ordenes,
      });
    }
  }

  return out;
}
