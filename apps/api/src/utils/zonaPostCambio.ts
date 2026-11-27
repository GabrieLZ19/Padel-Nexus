import { supabaseAdmin } from "../config/supabase";
import { esEliminatoriaDirecta } from "./formatoTorneo";
import {
  duracionParaFase,
  programarPartidosZonaPendientes,
} from "./programacionPartidos";
import { esModoDescanso, minutosDeModoDescanso } from "./programadorReglas";
import type { ResumenSincLlaveFap } from "./playoffAvance";

export type PartidosSinHorarioZona = {
  total: number;
  por_zona: Array<{ nombre: string; cantidad: number }>;
};

export type PostProcesoZonasResult = {
  fixture_reparado: Array<{ nombre_grupo: string; insertados: number }>;
  llave: ResumenSincLlaveFap | null;
  zonas_desprogramadas_conflicto_llave: string[];
  partidos_sin_horario: PartidosSinHorarioZona;
};

function partidoZonaRequiereHorario(p: {
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
  fecha_partido?: string | null;
  cancha_asignada?: string | null;
  estado_partido?: string | null;
}): boolean {
  if (!p.equipo_a_id || !p.equipo_b_id) return false;
  const estado = String(p.estado_partido || "").toLowerCase();
  if (
    estado.includes("pendiente ganadores") ||
    estado.includes("pendiente perdedores")
  ) {
    return false;
  }
  return !p.fecha_partido || !p.cancha_asignada;
}

export async function contarPartidosZonaSinHorario(
  torneoId: string,
  nombresZona: string[],
): Promise<PartidosSinHorarioZona> {
  const por_zona: Array<{ nombre: string; cantidad: number }> = [];
  let total = 0;

  for (const nombre of nombresZona) {
    const { data, error } = await supabaseAdmin
      .from("partidos")
      .select(
        "equipo_a_id, equipo_b_id, fecha_partido, cancha_asignada, estado_partido",
      )
      .eq("torneo_id", torneoId)
      .eq("ronda", nombre);

    if (error) {
      throw new Error(
        `No se pudo verificar horarios en ${nombre}: ${error.message}`,
      );
    }

    const cantidad = (data || []).filter(partidoZonaRequiereHorario).length;
    if (cantidad > 0) {
      por_zona.push({ nombre, cantidad });
      total += cantidad;
    }
  }

  return { total, por_zona };
}

export type OpcionesPostProcesoZonas = {
  sincronizarLlave?: boolean;
  reprogramarZonas?: boolean;
};

/**
 * TOR-24: mismo pipeline tras guardar zonas o mover una pareja (dedup, fixture,
 * llave FAP, desprogramación conflicto llave y auto-asignación de pendientes).
 */
export async function postProcesoTrasCambioZonas(
  torneoId: string,
  zonasRegeneradas: string[],
  opciones?: OpcionesPostProcesoZonas,
): Promise<PostProcesoZonasResult> {
  const sincronizarLlave = opciones?.sincronizarLlave !== false;
  const reprogramarZonas = opciones?.reprogramarZonas !== false;

  const {
    completarPartidosFaltantesTorneo,
    deduplicarPartidosPendientesTorneo,
  } = await import("./zonaFixtureRepair");

  await deduplicarPartidosPendientesTorneo(torneoId);

  const fixture_reparado =
    zonasRegeneradas.length > 0
      ? await completarPartidosFaltantesTorneo(torneoId, zonasRegeneradas)
      : [];

  let llave: ResumenSincLlaveFap | null = null;
  if (sincronizarLlave && zonasRegeneradas.length > 0) {
    const { sincronizarLlaveTrasCambioZonas } = await import("./playoffAvance");
    llave = await sincronizarLlaveTrasCambioZonas(torneoId);
  }

  let zonas_desprogramadas_conflicto_llave: string[] = [];
  if (reprogramarZonas && zonasRegeneradas.length > 0) {
    const { data: torneoProg } = await supabaseAdmin
      .from("torneos")
      .select(
        "duracion_partido_minutos, descanso_minutos, descanso_modo, formato",
      )
      .eq("id", torneoId)
      .maybeSingle();

    if (torneoProg && !esEliminatoriaDirecta(torneoProg.formato)) {
      const { aplicarDesprogramacionZonaTrasCambioTorneo } = await import(
        "./programacionZonaLlave"
      );
      const duracionBase = Number(
        torneoProg.duracion_partido_minutos || 90,
      );
      const modo = esModoDescanso(torneoProg.descanso_modo)
        ? torneoProg.descanso_modo
        : undefined;
      zonas_desprogramadas_conflicto_llave =
        await aplicarDesprogramacionZonaTrasCambioTorneo(
          torneoId,
          zonasRegeneradas,
          {
            duracionZonaMinutos: duracionParaFase(duracionBase, "zonas"),
            descansoMinutos: modo
              ? minutosDeModoDescanso(modo)
              : Number(torneoProg.descanso_minutos || 60),
            descansoModo: modo,
          },
        );

      for (const nombreZona of zonasRegeneradas) {
        await programarPartidosZonaPendientes(torneoId, nombreZona);
      }
    }
  }

  const partidos_sin_horario = await contarPartidosZonaSinHorario(
    torneoId,
    zonasRegeneradas,
  );

  return {
    fixture_reparado,
    llave,
    zonas_desprogramadas_conflicto_llave,
    partidos_sin_horario,
  };
}