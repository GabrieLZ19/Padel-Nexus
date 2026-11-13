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

function pairKey(a: string | null, b: string | null): string {
  if (!a || !b) return "";
  return [a, b].sort().join("|");
}

/**
 * Agrega partidos de zona que faltan sin borrar pendientes ni resultados ya jugados.
 */
export async function completarPartidosFaltantesDeGrupo(
  torneoId: string,
  grupoId: string,
  nombreGrupo: string,
): Promise<{ insertados: number; ordenes: number[] }> {
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

  const jugados = (existentes || []).filter((m) => m.ganador);
  const pairsJugados = new Set(
    jugados
      .map((m) => pairKey(m.equipo_a_id, m.equipo_b_id))
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
    if (ordenesPresentes.has(orden)) return;
    if (pairsJugados.has(pairKey(aId, bId))) return;
    faltantes.push({
      torneo_id: torneoId,
      ronda: nombreGrupo,
      orden,
      equipo_a_id: aId,
      equipo_b_id: bId,
      estado_partido: "Programado",
    });
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
): Promise<
  Array<{ nombre_grupo: string; insertados: number; ordenes: number[] }>
> {
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

  for (const g of grupos || []) {
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
