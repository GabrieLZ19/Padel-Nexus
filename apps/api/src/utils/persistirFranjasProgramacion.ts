import { supabaseAdmin } from "../config/supabase";
import { esModoDescanso, type ModoDescanso } from "./programadorReglas";
import {
  normalizarFechaProgramacionDia,
  type DisponibilidadTorneo,
} from "./programacionPartidos";

export { normalizarFechaProgramacionDia };

export type FranjasPorDiaInput = Record<string, { inicio?: string; fin?: string }>;

export async function persistirFranjasPorDiaTorneo(
  torneoId: string,
  franjasPorDia: FranjasPorDiaInput,
): Promise<void> {
  for (const [fechaRaw, franja] of Object.entries(franjasPorDia)) {
    const fecha = normalizarFechaProgramacionDia(fechaRaw);
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;

    const updates: { hora_inicio?: string; hora_fin?: string } = {};
    if (franja.inicio) {
      updates.hora_inicio = `${franja.inicio.slice(0, 5)}:00`;
    }
    if (franja.fin !== undefined && franja.fin !== "") {
      updates.hora_fin =
        franja.fin === "00:00" ? "23:59:59" : `${franja.fin.slice(0, 5)}:00`;
    }
    if (Object.keys(updates).length === 0) continue;

    const { data: filas, error: listError } = await supabaseAdmin
      .from("torneo_canchas_disponibilidad")
      .select("id, fecha")
      .eq("torneo_id", torneoId);

    if (listError) throw new Error(listError.message);

    const ids = (filas || [])
      .filter((row) => normalizarFechaProgramacionDia(row.fecha) === fecha)
      .map((row) => row.id);

    if (!ids.length) continue;

    const { error } = await supabaseAdmin
      .from("torneo_canchas_disponibilidad")
      .update(updates)
      .in("id", ids);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function persistirDescansoYDuracionTorneo(
  torneoId: string,
  opts: {
    duracionMinutos?: number;
    descansoModo?: ModoDescanso;
  },
): Promise<void> {
  const torneoUpdate: Record<string, unknown> = {};
  if (opts.duracionMinutos != null) {
    torneoUpdate.duracion_partido_minutos = opts.duracionMinutos;
  }
  if (esModoDescanso(opts.descansoModo)) {
    torneoUpdate.descanso_modo = opts.descansoModo;
  }
  if (Object.keys(torneoUpdate).length === 0) return;

  const { error } = await supabaseAdmin
    .from("torneos")
    .update(torneoUpdate)
    .eq("id", torneoId);
  if (error) throw new Error(error.message);
}

export function franjaHorariaDesdeDisponibilidad(
  disponibilidad: DisponibilidadTorneo[],
  dia: string,
): { inicio: string; fin: string } | null {
  const diaNorm = normalizarFechaProgramacionDia(dia);
  const row = disponibilidad.find(
    (c) => normalizarFechaProgramacionDia(c.fecha) === diaNorm,
  );
  if (!row) return null;

  const inicio = row.hora_inicio ? String(row.hora_inicio).slice(0, 5) : "";
  let fin = "";
  if (row.hora_fin) {
    const rawFin = String(row.hora_fin);
    fin =
      rawFin.startsWith("23:59") || rawFin.startsWith("00:00")
        ? "00:00"
        : rawFin.slice(0, 5);
  }
  return { inicio, fin };
}

/** Arma `franjas_por_dia` del board: query del cliente o horas persistidas en disponibilidad. */
export function construirFranjasPorDiaBoard(
  dias: string[],
  disponibilidad: DisponibilidadTorneo[],
  opciones?: {
    franjasPorDia?: FranjasPorDiaInput;
    horaInicio?: string;
    horaFin?: string;
  },
): Record<string, { inicio: string; fin: string }> {
  const franjasPorDiaMap: Record<string, { inicio: string; fin: string }> = {};
  for (const f of dias) {
    const franjaOpt =
      opciones?.franjasPorDia?.[f] ??
      opciones?.franjasPorDia?.[normalizarFechaProgramacionDia(f)];
    const desdeDb = franjaHorariaDesdeDisponibilidad(disponibilidad, f);
    const inicioDisp = desdeDb?.inicio || "";
    const finDisp = desdeDb?.fin || "";
    franjasPorDiaMap[f] = {
      inicio:
        franjaOpt?.inicio ||
        inicioDisp ||
        opciones?.horaInicio ||
        "08:00",
      fin:
        franjaOpt?.fin !== undefined && franjaOpt?.fin !== ""
          ? franjaOpt.fin
          : finDisp || opciones?.horaFin || "",
    };
  }
  return franjasPorDiaMap;
}
