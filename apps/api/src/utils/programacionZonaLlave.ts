import type { FapBracketMatch } from "./fapBracketTypes";
import { parseSeedRef, zoneLetterFromNombreGrupo } from "./fapZoneSeeds";
import {
  esRondaDeZona,
  minutosDeModoDescanso,
  type ModoDescanso,
} from "./programadorReglas";

const FAP_DESCANSO_MINUTOS_TRAS_FIN = 60;

export type PartidoProgZonaLlave = {
  id?: string;
  ronda?: string;
  orden?: number;
  cancha_asignada?: string | null;
  fecha_partido?: string | null;
};

function parseFechaPartidoIso(
  iso: string,
): { fecha: string; startMin: number } | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const startMin = d.getHours() * 60 + d.getMinutes();
    return { fecha, startMin };
  } catch {
    return null;
  }
}

function normalizarFecha(fecha: string): string {
  const trimmed = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minInicioDespuesDePartido(
  fecha: string,
  startMin: number,
  duracionMinutos: number,
  descansoMinutos?: number,
  descansoModo?: ModoDescanso,
): { fecha: string; startMin: number } {
  const descansoMin =
    descansoModo === "entre_inicios_240"
      ? 240
      : (descansoMinutos ??
        (descansoModo
          ? minutosDeModoDescanso(descansoModo)
          : FAP_DESCANSO_MINUTOS_TRAS_FIN));

  let nextStart: number;
  if (descansoModo === "entre_inicios_240") {
    nextStart = startMin + 240;
  } else {
    nextStart = startMin + duracionMinutos + descansoMin;
  }

  let nextFecha = normalizarFecha(fecha);
  if (nextStart >= 24 * 60) {
    nextStart -= 24 * 60;
    const [y, m, d] = nextFecha.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1);
    nextFecha = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  }
  return { fecha: nextFecha, startMin: nextStart };
}

/** Letras de zona (A, B, …) de las que depende un cruce de llave (semillas + feeders). */
export function zoneLettersQueAlimentanMatchNo(
  matchNo: number,
  matrix: readonly FapBracketMatch[],
  feedersByMatchNo: Map<number, number[]>,
): Set<string> {
  const letters = new Set<string>();
  const seen = new Set<number>();

  const visit = (orden: number) => {
    if (seen.has(orden)) return;
    seen.add(orden);
    const spec = matrix.find((m) => m.matchNo === orden);
    if (spec) {
      for (const ref of [spec.a, spec.b]) {
        const parsed = parseSeedRef(ref);
        if (parsed) letters.add(parsed.zone);
      }
    }
    for (const dep of feedersByMatchNo.get(orden) || []) {
      visit(dep);
    }
  };

  visit(matchNo);
  return letters;
}

/** Último fin (inicio + duración) programado en partidos de una zona letra. */
export function ultimoFinProgramadoEnZona(
  partidos: PartidoProgZonaLlave[],
  zoneLetter: string,
  duracionZonaMinutos: number,
): { fecha: string; startMin: number } | null {
  const duracion = Math.max(30, duracionZonaMinutos);
  let mejor: { fecha: string; startMin: number } | null = null;
  let mejorRank = -1;

  for (const p of partidos) {
    if (!esRondaDeZona(p.ronda)) continue;
    if (zoneLetterFromNombreGrupo(String(p.ronda)) !== zoneLetter) continue;
    if (!p.fecha_partido) continue;
    const parsed = parseFechaPartidoIso(String(p.fecha_partido));
    if (!parsed) continue;
    const finMin = parsed.startMin + duracion;
    const rank =
      new Date(`${parsed.fecha}T00:00:00`).getTime() + finMin * 60_000;
    if (rank > mejorRank) {
      mejorRank = rank;
      mejor = { fecha: parsed.fecha, startMin: parsed.startMin };
    }
  }
  return mejor;
}

export function partidoAntesDeInstanteProgramacion(
  parsed: { fecha: string; startMin: number },
  min: { fecha: string; startMin: number },
): boolean {
  return (
    parsed.fecha < min.fecha ||
    (parsed.fecha === min.fecha && parsed.startMin < min.startMin)
  );
}

export type ConflictoLlaveZona = {
  partido_llave_id: string;
  zone_letter: string;
  message: string;
};

/**
 * TOR-48: cruces de llave con horario que arrancan antes de que termine
 * la fase clasificatoria programada de una zona que los alimenta.
 */
export function detectarLlaveAntesFinZonaAlimentadora(
  partidos: PartidoProgZonaLlave[],
  matrix: readonly FapBracketMatch[],
  feedersByMatchNo: Map<number, number[]>,
  opciones: {
    duracionZonaMinutos: number;
    descansoMinutos?: number;
    descansoModo?: ModoDescanso;
  },
): ConflictoLlaveZona[] {
  const duracionZona = Math.max(30, opciones.duracionZonaMinutos);
  const out: ConflictoLlaveZona[] = [];

  const playoff = partidos.filter(
    (p) => p.cancha_asignada && p.fecha_partido && !esRondaDeZona(p.ronda),
  );

  for (const p of playoff) {
    const id = String((p as { id?: string }).id || "");
    if (!id) continue;
    const orden = Number(p.orden);
    if (!Number.isFinite(orden) || orden <= 0) continue;
    const parsed = parseFechaPartidoIso(String(p.fecha_partido));
    if (!parsed) continue;

    const letters = zoneLettersQueAlimentanMatchNo(
      orden,
      matrix,
      feedersByMatchNo,
    );
    for (const letter of letters) {
      const ultimo = ultimoFinProgramadoEnZona(
        partidos,
        letter,
        duracionZona,
      );
      if (!ultimo) continue;

      const minInicio = minInicioDespuesDePartido(
        ultimo.fecha,
        ultimo.startMin,
        duracionZona,
        opciones.descansoMinutos,
        opciones.descansoModo,
      );

      if (partidoAntesDeInstanteProgramacion(parsed, minInicio)) {
        out.push({
          partido_llave_id: id,
          zone_letter: letter,
          message: `Cruce de llave programado antes de que termine la zona ${letter} (clasificatoria pendiente en cancha/horario)`,
        });
      }
    }
  }
  return out;
}

/**
 * Tras regenerar zonas: quita horario de partidos de zona que quedaron
 * programados después de un cruce de llave que depende de esa zona.
 */
export function idsPartidosZonaADesprogramarPorConflictoLlave(
  partidos: PartidoProgZonaLlave[],
  matrix: readonly FapBracketMatch[],
  feedersByMatchNo: Map<number, number[]>,
  nombresZonasRegeneradas: string[],
  opciones: {
    duracionZonaMinutos: number;
    descansoMinutos?: number;
    descansoModo?: ModoDescanso;
  },
): string[] {
  const nombres = new Set(
    nombresZonasRegeneradas.map((n) => String(n).trim()),
  );
  if (!nombres.size) return [];

  const conflictos = detectarLlaveAntesFinZonaAlimentadora(
    partidos,
    matrix,
    feedersByMatchNo,
    opciones,
  );
  if (!conflictos.length) return [];

  const letrasConflictivas = new Set(conflictos.map((c) => c.zone_letter));
  const duracionZona = Math.max(30, opciones.duracionZonaMinutos);
  const ids: string[] = [];

  for (const p of partidos) {
    if (!esRondaDeZona(p.ronda)) continue;
    const nombre = String(p.ronda || "").trim();
    if (!nombres.has(nombre)) continue;
    const letter = zoneLetterFromNombreGrupo(nombre);
    if (!letrasConflictivas.has(letter)) continue;
    if (!p.fecha_partido) continue;
    const parsed = parseFechaPartidoIso(String(p.fecha_partido));
    if (!parsed) continue;

    const ultimo = ultimoFinProgramadoEnZona(partidos, letter, duracionZona);
    if (!ultimo) continue;

    for (const c of conflictos) {
      if (c.zone_letter !== letter) continue;
      const llave = partidos.find(
        (x) => String((x as { id?: string }).id) === c.partido_llave_id,
      );
      if (!llave?.fecha_partido) continue;
      const pl = parseFechaPartidoIso(String(llave.fecha_partido));
      if (!pl) continue;
      const finZona = parsed.startMin + duracionZona;
      const finRank =
        new Date(`${parsed.fecha}T00:00:00`).getTime() + finZona * 60_000;
      const llaveRank =
        new Date(`${pl.fecha}T00:00:00`).getTime() + pl.startMin * 60_000;
      if (finRank > llaveRank) {
        const pid = String((p as { id?: string }).id || "");
        if (pid) ids.push(pid);
        break;
      }
    }
  }

  return [...new Set(ids)];
}

export async function aplicarDesprogramacionZonaTrasCambioTorneo(
  torneoId: string,
  nombresZonasRegeneradas: string[],
  opciones: {
    duracionZonaMinutos: number;
    descansoMinutos?: number;
    descansoModo?: ModoDescanso;
  },
): Promise<string[]> {
  if (!nombresZonasRegeneradas.length) return [];

  const { supabaseAdmin } = await import("../config/supabase");
  const { resolveFapPlantillaPairCount } = await import("./fapPlantillaTorneo");
  const { getFapBracketForPairCount } = await import("./fapBracketMatrices");
  const { buildFeedersByMatchNo } = await import("./programacionPartidos");

  const pairCount = await resolveFapPlantillaPairCount(torneoId);
  const matrix = getFapBracketForPairCount(pairCount);
  if (!matrix?.length) return [];

  const { data: partidos, error } = await supabaseAdmin
    .from("partidos")
    .select("id, ronda, orden, cancha_asignada, fecha_partido")
    .eq("torneo_id", torneoId);
  if (error || !partidos?.length) return [];

  const feeders = buildFeedersByMatchNo(matrix);
  const ids = idsPartidosZonaADesprogramarPorConflictoLlave(
    partidos,
    matrix,
    feeders,
    nombresZonasRegeneradas,
    opciones,
  );
  if (!ids.length) return [];

  await supabaseAdmin
    .from("partidos")
    .update({ cancha_asignada: null, fecha_partido: null })
    .in("id", ids);

  return ids;
}