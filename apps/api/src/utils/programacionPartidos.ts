import { supabaseAdmin } from "../config/supabase";

export interface PartidoProgramable {
  ronda?: string;
  orden?: number;
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
  estado_partido?: string | null;
  cancha_asignada?: string | null;
  fecha_partido?: string | null;
  [key: string]: unknown;
}

export interface DisponibilidadTorneo {
  club_id: string;
  cancha_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string | null;
  clubes?: { nombre?: string } | null;
  canchas?: { nombre?: string } | null;
}

export interface SlotProgramacion {
  canchaLabel: string;
  fecha: string;
  hora: string;
  fechaIso: string;
}

/** Ventana FAP: no programar antes de 09:00 ni después de 22:00 (inicio). */
export const FAP_HORA_INICIO_MIN = 9 * 60;
export const FAP_HORA_INICIO_MAX = 22 * 60;

/**
 * FAP: mínimo 1 h entre la finalización estimada de un partido y el comienzo del siguiente
 * (regla de alteración; también usamos como descanso base entre partidos de la misma pareja).
 */
export const FAP_DESCANSO_MINUTOS_TRAS_FIN = 60;

/** FAP: si una pareja juega 3 partidos el mismo día, el 2º ≥ 4 h desde el inicio del 1º. */
export const FAP_INTERVALO_3PARTIDOS_2DO_MIN = 4 * 60;

/** FAP: si una pareja juega 3 partidos el mismo día, el 3º ≥ 6 h desde el inicio del 2º. */
export const FAP_INTERVALO_3PARTIDOS_3RO_MIN = 6 * 60;

interface PartidoParejaHistorial {
  fecha: string;
  startMin: number;
  endMin: number;
}

function normalizarFecha(fecha: string): string {
  return String(fecha || "").split("T")[0];
}

function parseHoraAMinutos(hora: string): number {
  const [h, m] = String(hora || "0:0")
    .slice(0, 5)
    .split(":")
    .map(Number);
  return h * 60 + (m || 0);
}

function minutosAHoraStr(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Torneos FAP operan en Argentina: wall-clock de programación = esta TZ. */
const TZ_PROGRAMACION = "America/Argentina/Buenos_Aires";

function wallClockParts(
  instant: Date,
): { fecha: string; startMin: number } | null {
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_PROGRAMACION,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "";
  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  let hour = Number(get("hour"));
  // en-CA a veces usa 24:00 → normalizar
  if (hour === 24) hour = 0;
  const minute = Number(get("minute"));
  if (!yyyy || !mm || !dd) return null;
  return {
    fecha: `${yyyy}-${mm}-${dd}`,
    startMin: hour * 60 + minute,
  };
}

function buildFechaIso(fecha: string, minutosDesdeMedianoche: number): string {
  const [y, mo, d] = normalizarFecha(fecha).split("-").map(Number);
  // Argentina sin DST: UTC−3. Wall-clock local → Instant UTC.
  const utcTotal = minutosDesdeMedianoche + 3 * 60;
  const dayOffset = Math.floor(utcTotal / (24 * 60));
  const minsInDay = ((utcTotal % (24 * 60)) + 24 * 60) % (24 * 60);
  const uh = Math.floor(minsInDay / 60);
  const um = minsInDay % 60;
  return new Date(Date.UTC(y, mo - 1, d + dayOffset, uh, um, 0)).toISOString();
}

function parseFechaPartidoIso(
  iso: string,
): { fecha: string; startMin: number } | null {
  try {
    return wallClockParts(new Date(iso));
  } catch {
    return null;
  }
}

export function buildCanchaLabel(d: DisponibilidadTorneo): string {
  const club = d.clubes?.nombre || "";
  const cancha =
    d.canchas?.nombre ||
    (d.cancha_id ? `Cancha ${String(d.cancha_id).slice(0, 4)}` : "");
  if (!cancha) return "";
  return club ? `${club} - ${cancha}` : cancha;
}

export function slotKey(
  canchaLabel: string,
  fecha: string,
  hora: string,
): string {
  return `${canchaLabel}|${normalizarFecha(fecha)}|${hora.slice(0, 8)}`;
}

export function expandirSlotsDisponibilidad(
  disponibilidad: DisponibilidadTorneo[],
  duracionMinutos: number,
  opciones?: { horaMin?: number; horaMax?: number },
): SlotProgramacion[] {
  const duracion = Math.max(30, duracionMinutos || 90);
  const horaMin = opciones?.horaMin ?? FAP_HORA_INICIO_MIN;
  const horaMax = opciones?.horaMax ?? FAP_HORA_INICIO_MAX;
  const slots: SlotProgramacion[] = [];

  const bloques = [...disponibilidad].sort((a, b) => {
    const fa = normalizarFecha(a.fecha);
    const fb = normalizarFecha(b.fecha);
    if (fa !== fb) return fa.localeCompare(fb);
    return (
      parseHoraAMinutos(a.hora_inicio) - parseHoraAMinutos(b.hora_inicio)
    );
  });

  for (const bloque of bloques) {
    const canchaLabel = buildCanchaLabel(bloque);
    if (!canchaLabel) continue;

    const fecha = normalizarFecha(bloque.fecha);
    let inicio = parseHoraAMinutos(bloque.hora_inicio);
    const finConfigurado = bloque.hora_fin
      ? parseHoraAMinutos(bloque.hora_fin)
      : inicio + duracion;
    let fin = finConfigurado > inicio ? finConfigurado : inicio + duracion;

    inicio = Math.max(inicio, horaMin);
    fin = Math.min(fin, horaMax + duracion);

    for (let minuto = inicio; minuto + duracion <= fin; minuto += duracion) {
      if (minuto < horaMin || minuto > horaMax) continue;
      const hora = minutosAHoraStr(minuto);
      slots.push({
        canchaLabel,
        fecha,
        hora,
        fechaIso: buildFechaIso(fecha, minuto),
      });
    }
  }

  return slots.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    if (a.hora !== b.hora) return a.hora.localeCompare(b.hora);
    return a.canchaLabel.localeCompare(b.canchaLabel);
  });
}

function pesoRonda(ronda: string): number {
  const upper = String(ronda || "")
    .trim()
    .toUpperCase();
  const zona = upper.match(/^ZONA\s+([A-Z])/);
  if (zona) return zona[1].charCodeAt(0) - 65;

  const ordenPlayoff = [
    "PRELIMINARES",
    "32AVOS",
    "16AVOS",
    "OCTAVOS",
    "CUARTOS",
    "SEMIS",
    "SEMIFINAL",
    "FINAL",
  ];
  const idx = ordenPlayoff.indexOf(upper);
  return idx >= 0 ? 100 + idx : 200;
}

function esRondaZona(ronda?: string | null): boolean {
  return /^ZONA\s+/i.test(String(ronda || "").trim());
}

function esPendienteZona(p: PartidoProgramable): boolean {
  if (!esRondaZona(p.ronda)) return false;
  return String(p.estado_partido || "")
    .toLowerCase()
    .includes("pendiente");
}

/** Partidos de zona TBD (G/P) también deben recibir cancha/hora al generar. */
function necesitaHorario(
  p: PartidoProgramable,
  opciones?: { permitirSinEquipos?: boolean },
): boolean {
  if (p.cancha_asignada && p.fecha_partido) return false;
  if (esPendienteZona(p)) return true;
  // Modo pre-programacion de llave: aceptamos partidos sin equipos aun (solo
  // se agenda cancha/hora tentativa respetando feeders). Los descansos por
  // pareja no aplican porque no hay pareja asignada.
  if (opciones?.permitirSinEquipos) {
    const estado = String(p.estado_partido || "").toLowerCase();
    return !estado.includes("pendiente");
  }
  if (!p.equipo_a_id || !p.equipo_b_id) return false;
  const estado = String(p.estado_partido || "").toLowerCase();
  return !estado.includes("pendiente");
}

function getHistorialPareja(
  map: Map<string, PartidoParejaHistorial[]>,
  parejaId: string,
): PartidoParejaHistorial[] {
  let list = map.get(parejaId);
  if (!list) {
    list = [];
    map.set(parejaId, list);
  }
  return list;
}

/**
 * Valida solape y descansos FAP para una pareja en un slot propuesto.
 */
export function parejaPuedeJugarEnSlot(
  historial: PartidoParejaHistorial[],
  fecha: string,
  startMin: number,
  duracionMinutos: number,
): boolean {
  const endMin = startMin + duracionMinutos;
  const fechaN = normalizarFecha(fecha);

  for (const prev of historial) {
    if (prev.fecha !== fechaN) continue;

    // Solape de intervalo de juego
    if (startMin < prev.endMin && endMin > prev.startMin) return false;

    // Descanso mínimo: 1 h tras el fin estimado del partido anterior
    if (startMin >= prev.startMin) {
      if (startMin < prev.endMin + FAP_DESCANSO_MINUTOS_TRAS_FIN) return false;
    } else if (prev.startMin < endMin + FAP_DESCANSO_MINUTOS_TRAS_FIN) {
      return false;
    }
  }

  const delDia = [...historial.filter((h) => h.fecha === fechaN)].sort(
    (a, b) => a.startMin - b.startMin,
  );
  const proyectado = [...delDia, { fecha: fechaN, startMin, endMin }].sort(
    (a, b) => a.startMin - b.startMin,
  );

  // FAP: 3 partidos el mismo día → 2º ≥ +4 h desde 1º; 3º ≥ +6 h desde 2º (inicios)
  if (proyectado.length >= 3) {
    if (
      proyectado[1].startMin <
      proyectado[0].startMin + FAP_INTERVALO_3PARTIDOS_2DO_MIN
    ) {
      return false;
    }
    if (
      proyectado[2].startMin <
      proyectado[1].startMin + FAP_INTERVALO_3PARTIDOS_3RO_MIN
    ) {
      return false;
    }
  }

  return true;
}

function equiposDePartido(p: PartidoProgramable): string[] {
  const ids: string[] = [];
  if (p.equipo_a_id) ids.push(String(p.equipo_a_id));
  if (p.equipo_b_id) ids.push(String(p.equipo_b_id));
  return ids;
}

function parejasZonaDesdePartidos(
  partidos: PartidoProgramable[],
  ronda: string,
): string[] {
  const ids = new Set<string>();
  for (const p of partidos) {
    if (String(p.ronda || "") !== ronda) continue;
    for (const id of equiposDePartido(p)) ids.add(id);
  }
  return [...ids];
}

function registrarBusyParejas(
  historial: Map<string, PartidoParejaHistorial[]>,
  parejaIds: string[],
  fecha: string,
  startMin: number,
  duracionMinutos: number,
): void {
  const entry: PartidoParejaHistorial = {
    fecha: normalizarFecha(fecha),
    startMin,
    endMin: startMin + duracionMinutos,
  };
  for (const id of parejaIds) {
    getHistorialPareja(historial, id).push(entry);
  }
}

function parejasPueden(
  historial: Map<string, PartidoParejaHistorial[]>,
  parejaIds: string[],
  fecha: string,
  startMin: number,
  duracionMinutos: number,
): boolean {
  return parejaIds.every((id) =>
    parejaPuedeJugarEnSlot(
      getHistorialPareja(historial, id),
      fecha,
      startMin,
      duracionMinutos,
    ),
  );
}

function momentoKey(fecha: string, hora: string): string {
  return `${normalizarFecha(fecha)}|${hora.slice(0, 8)}`;
}

function agruparSlotsPorMomento(
  slots: SlotProgramacion[],
): { key: string; fecha: string; hora: string; startMin: number; slots: SlotProgramacion[] }[] {
  const map = new Map<string, SlotProgramacion[]>();
  for (const slot of slots) {
    const key = momentoKey(slot.fecha, slot.hora);
    const list = map.get(key) || [];
    list.push(slot);
    map.set(key, list);
  }

  return [...map.entries()]
    .map(([key, group]) => ({
      key,
      fecha: group[0].fecha,
      hora: group[0].hora,
      startMin: parseHoraAMinutos(group[0].hora),
      slots: group,
    }))
    .sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.startMin - b.startMin;
    });
}

function asignarSlotAPartido(
  partido: PartidoProgramable,
  slot: SlotProgramacion,
  ocupados: Set<string>,
  historial: Map<string, PartidoParejaHistorial[]>,
  duracionMinutos: number,
  parejaIdsExtra?: string[],
): void {
  const key = slotKey(slot.canchaLabel, slot.fecha, slot.hora);
  ocupados.add(key);
  partido.cancha_asignada = slot.canchaLabel;
  partido.fecha_partido = slot.fechaIso;

  const startMin = parseHoraAMinutos(slot.hora);
  const ids = [
    ...new Set([...equiposDePartido(partido), ...(parejaIdsExtra || [])]),
  ];
  registrarBusyParejas(historial, ids, slot.fecha, startMin, duracionMinutos);
}

/**
 * Busca N canchas libres en el mismo momento que cumplan descanso de parejas.
 */
function buscarOlaSimultanea(
  cantidad: number,
  slots: SlotProgramacion[],
  ocupados: Set<string>,
  historial: Map<string, PartidoParejaHistorial[]>,
  parejaIds: string[],
  duracionMinutos: number,
): SlotProgramacion[] | null {
  const momentos = agruparSlotsPorMomento(slots);

  for (const momento of momentos) {
    if (
      !parejasPueden(
        historial,
        parejaIds,
        momento.fecha,
        momento.startMin,
        duracionMinutos,
      )
    ) {
      continue;
    }

    const libres = momento.slots.filter(
      (s) => !ocupados.has(slotKey(s.canchaLabel, s.fecha, s.hora)),
    );
    if (libres.length < cantidad) continue;
    return libres.slice(0, cantidad);
  }

  return null;
}

function buscarSlotIndividual(
  slots: SlotProgramacion[],
  ocupados: Set<string>,
  historial: Map<string, PartidoParejaHistorial[]>,
  parejaIds: string[],
  duracionMinutos: number,
  notBefore: { fecha: string; startMin: number }[] = [],
): SlotProgramacion | null {
  for (const slot of slots) {
    const key = slotKey(slot.canchaLabel, slot.fecha, slot.hora);
    if (ocupados.has(key)) continue;
    const startMin = parseHoraAMinutos(slot.hora);
    let tooEarly = false;
    for (const nb of notBefore) {
      if (slot.fecha < nb.fecha) {
        tooEarly = true;
        break;
      }
      if (slot.fecha === nb.fecha && startMin < nb.startMin) {
        tooEarly = true;
        break;
      }
    }
    if (tooEarly) continue;
    if (
      !parejasPueden(
        historial,
        parejaIds,
        slot.fecha,
        startMin,
        duracionMinutos,
      )
    ) {
      continue;
    }
    return slot;
  }
  return null;
}

/** Cruces que alimentan un matchNo (winnerTo → destino). */
export function buildFeedersByMatchNo(
  edges: ReadonlyArray<{ matchNo: number; winnerTo: number | null }>,
): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const e of edges) {
    if (e.winnerTo == null) continue;
    const list = map.get(e.winnerTo) || [];
    list.push(e.matchNo);
    map.set(e.winnerTo, list);
  }
  return map;
}

function notBeforeDesdeFeeders(
  partido: PartidoProgramable,
  todos: PartidoProgramable[],
  feedersByMatchNo: Map<number, number[]>,
  duracionMinutos: number,
): { fecha: string; startMin: number }[] {
  const orden = Number(partido.orden);
  if (!Number.isFinite(orden) || orden <= 0) return [];
  const feeders = feedersByMatchNo.get(orden) || [];
  const out: { fecha: string; startMin: number }[] = [];
  for (const fOrden of feeders) {
    const feeder = todos.find(
      (p) => Number(p.orden) === fOrden && p.fecha_partido,
    );
    if (!feeder?.fecha_partido) continue;
    const parsed = parseFechaPartidoIso(String(feeder.fecha_partido));
    if (!parsed) continue;
    let startMin =
      parsed.startMin + duracionMinutos + FAP_DESCANSO_MINUTOS_TRAS_FIN;
    let fecha = parsed.fecha;
    if (startMin >= 24 * 60) {
      startMin -= 24 * 60;
      const [y, m, d] = fecha.split("-").map(Number);
      const next = new Date(y, m - 1, d + 1);
      fecha = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    }
    out.push({ fecha, startMin });
  }
  return out;
}

function seedHistorialDesdePartidos(
  partidos: PartidoProgramable[],
  historial: Map<string, PartidoParejaHistorial[]>,
  ocupados: Set<string>,
  duracionMinutos: number,
): void {
  for (const p of partidos) {
    if (!p.fecha_partido || !p.cancha_asignada) continue;
    const parsed = parseFechaPartidoIso(String(p.fecha_partido));
    if (!parsed) continue;

    const hora = minutosAHoraStr(parsed.startMin);
    ocupados.add(slotKey(String(p.cancha_asignada), parsed.fecha, hora));

    let ids = equiposDePartido(p);
    // TBD zona ya con horario: bloquear todas las parejas de la zona
    if (ids.length === 0 && esPendienteZona(p)) {
      ids = parejasZonaDesdePartidos(partidos, String(p.ronda || ""));
    }
    registrarBusyParejas(
      historial,
      ids,
      parsed.fecha,
      parsed.startMin,
      duracionMinutos,
    );
  }
}

export function buildOcupadosDesdePartidos(
  partidos: Array<{
    cancha_asignada?: string | null;
    fecha_partido?: string | null;
  }>,
): Set<string> {
  const ocupados = new Set<string>();

  for (const partido of partidos) {
    const cancha = String(partido.cancha_asignada || "").trim();
    if (!cancha || !partido.fecha_partido) continue;

    const parsed = parseFechaPartidoIso(String(partido.fecha_partido));
    if (!parsed) continue;
    const hora = minutosAHoraStr(parsed.startMin);
    ocupados.add(slotKey(cancha, parsed.fecha, hora));
  }

  return ocupados;
}

/**
 * Asigna cancha/hora respetando:
 * - ocupación de cancha
 * - no solape de la misma pareja
 * - descanso FAP (1 h tras fin estimado; 4 h / 6 h si 3 partidos el mismo día)
 * - zona de 4: oleadas simultáneas (1vs4+2vs3, luego GvsG+PvsP)
 */
export function asignarHorariosAPartidos(
  partidos: PartidoProgramable[],
  slots: SlotProgramacion[],
  ocupadosIniciales?: Set<string>,
  opciones?: {
    duracionMinutos?: number;
    /** matchNo destino → matchNos que lo alimentan (llave FAP). */
    feedersByMatchNo?: Map<number, number[]>;
    /**
     * Modo pre-programacion de llave: permite asignar cancha/hora a partidos
     * sin equipos definidos (usando solo feeders para el ordenamiento).
     */
    permitirSinEquipos?: boolean;
  },
): void {
  if (!slots.length || !partidos.length) return;

  const duracionMinutos = Math.max(30, opciones?.duracionMinutos || 75);
  const feedersByMatchNo = opciones?.feedersByMatchNo || new Map();
  const permitirSinEquipos = opciones?.permitirSinEquipos === true;
  const ocupados = new Set(ocupadosIniciales || []);
  const historial = new Map<string, PartidoParejaHistorial[]>();

  seedHistorialDesdePartidos(partidos, historial, ocupados, duracionMinutos);

  const pendientes = partidos
    .map((partido, index) => ({ partido, index }))
    .filter(({ partido }) =>
      necesitaHorario(partido, { permitirSinEquipos }),
    );

  // Agrupar por zona para oleadas FAP; el resto secuencial
  const porZona = new Map<string, { partido: PartidoProgramable; index: number }[]>();
  const resto: { partido: PartidoProgramable; index: number }[] = [];

  for (const item of pendientes) {
    const ronda = String(item.partido.ronda || "");
    if (esRondaZona(ronda)) {
      const list = porZona.get(ronda) || [];
      list.push(item);
      porZona.set(ronda, list);
    } else {
      resto.push(item);
    }
  }

  const zonasOrdenadas = [...porZona.entries()].sort(
    (a, b) => pesoRonda(a[0]) - pesoRonda(b[0]),
  );

  for (const [ronda, items] of zonasOrdenadas) {
    const ordenados = [...items].sort(
      (a, b) => (a.partido.orden || 0) - (b.partido.orden || 0),
    );
    const parejasZona = parejasZonaDesdePartidos(
      partidos.filter((p) => String(p.ronda || "") === ronda),
      ronda,
    );

    const tbd = ordenados.filter((i) => esPendienteZona(i.partido));

    // Zona de 4 FAP: ola 1 (orden 1-2) y ola 2 (orden 3-4) simultáneas
    const ola1 = ordenados.filter(
      (i) => (i.partido.orden || 0) === 1 || (i.partido.orden || 0) === 2,
    );
    const ola2 = ordenados.filter(
      (i) => (i.partido.orden || 0) === 3 || (i.partido.orden || 0) === 4,
    );
    const esZonaCuatro =
      ola1.length === 2 &&
      ola2.length === 2 &&
      ordenados.length === 4;

    if (esZonaCuatro) {
      const idsOla1 = [
        ...new Set(ola1.flatMap((i) => equiposDePartido(i.partido))),
      ];
      const slotsOla1 = buscarOlaSimultanea(
        2,
        slots,
        ocupados,
        historial,
        idsOla1.length ? idsOla1 : parejasZona,
        duracionMinutos,
      );
      if (slotsOla1) {
        ola1.forEach((item, idx) => {
          asignarSlotAPartido(
            partidos[item.index],
            slotsOla1[idx],
            ocupados,
            historial,
            duracionMinutos,
          );
        });
      }

      // Ola 2: todas las parejas de la zona juegan (G vs G y P vs P)
      const idsOla2 = parejasZona.length ? parejasZona : idsOla1;
      const slotsOla2 = buscarOlaSimultanea(
        2,
        slots,
        ocupados,
        historial,
        idsOla2,
        duracionMinutos,
      );
      if (slotsOla2) {
        ola2.forEach((item, idx) => {
          asignarSlotAPartido(
            partidos[item.index],
            slotsOla2[idx],
            ocupados,
            historial,
            duracionMinutos,
            esPendienteZona(item.partido) ? idsOla2 : undefined,
          );
        });
      }
      continue;
    }

    // Zona de 3 (u otras): secuencial con descanso por pareja
    for (const item of ordenados) {
      if (esPendienteZona(item.partido)) continue;
      const ids = equiposDePartido(item.partido);
      const slot = buscarSlotIndividual(
        slots,
        ocupados,
        historial,
        ids,
        duracionMinutos,
      );
      if (!slot) continue;
      asignarSlotAPartido(
        partidos[item.index],
        slot,
        ocupados,
        historial,
        duracionMinutos,
      );
    }

    // TBD sueltos (zona regenerada parcial)
    for (const item of tbd) {
      if (partidos[item.index].fecha_partido) continue;
      const slot = buscarSlotIndividual(
        slots,
        ocupados,
        historial,
        parejasZona,
        duracionMinutos,
      );
      if (!slot) continue;
      asignarSlotAPartido(
        partidos[item.index],
        slot,
        ocupados,
        historial,
        duracionMinutos,
        parejasZona,
      );
    }
  }

  const restoOrdenado = resto.sort((a, b) => {
    const peso = pesoRonda(a.partido.ronda || "") - pesoRonda(b.partido.ronda || "");
    if (peso !== 0) return peso;
    return (a.partido.orden || 0) - (b.partido.orden || 0);
  });

  for (const item of restoOrdenado) {
    if (partidos[item.index].fecha_partido) continue;
    const ids = equiposDePartido(item.partido);
    const notBefore = notBeforeDesdeFeeders(
      item.partido,
      partidos,
      feedersByMatchNo,
      duracionMinutos,
    );
    const slot = buscarSlotIndividual(
      slots,
      ocupados,
      historial,
      ids,
      duracionMinutos,
      notBefore,
    );
    if (!slot) continue;
    asignarSlotAPartido(
      partidos[item.index],
      slot,
      ocupados,
      historial,
      duracionMinutos,
    );
  }
}

export async function cargarContextoProgramacion(torneoId: string): Promise<{
  duracionMinutos: number;
  disponibilidad: DisponibilidadTorneo[];
}> {
  const [{ data: torneo }, { data: disponibilidad }] = await Promise.all([
    supabaseAdmin
      .from("torneos")
      .select("duracion_partido_minutos")
      .eq("id", torneoId)
      .maybeSingle(),
    supabaseAdmin
      .from("torneo_canchas_disponibilidad")
      .select(
        "club_id, cancha_id, fecha, hora_inicio, hora_fin, canchas(*), clubes(*)",
      )
      .eq("torneo_id", torneoId)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true }),
  ]);

  return {
    duracionMinutos: Number(torneo?.duracion_partido_minutos || 90),
    disponibilidad: (disponibilidad || []) as DisponibilidadTorneo[],
  };
}

export type FaseProgramacion = "zonas" | "llave";

/** FAP: zonas default/mín 75′ (permite 60); llave mín 90′. */
export function duracionParaFase(
  configurada: number,
  fase: FaseProgramacion,
): number {
  const base = Number(configurada) || 0;
  if (fase === "zonas") {
    if (base === 60) return 60;
    return Math.max(75, base || 75);
  }
  return Math.max(90, base || 90);
}

export async function programarPartidosConDisponibilidad(
  torneoId: string,
  partidos: PartidoProgramable[],
  opciones?: {
    ocupados?: Set<string>;
    fase?: FaseProgramacion;
    duracionMinutos?: number;
    feedersByMatchNo?: Map<number, number[]>;
    permitirSinEquipos?: boolean;
  },
): Promise<void> {
  const { duracionMinutos: configurada, disponibilidad } =
    await cargarContextoProgramacion(torneoId);
  if (!disponibilidad.length) return;

  const fase = opciones?.fase || "zonas";
  const duracionMinutos =
    opciones?.duracionMinutos ?? duracionParaFase(configurada, fase);

  const slots = expandirSlotsDisponibilidad(disponibilidad, duracionMinutos);
  asignarHorariosAPartidos(partidos, slots, opciones?.ocupados, {
    duracionMinutos,
    feedersByMatchNo: opciones?.feedersByMatchNo,
    permitirSinEquipos: opciones?.permitirSinEquipos,
  });
}

/**
 * Programa partidos de llave que ya tienen ambos equipos y aún no tienen cancha/hora.
 * También reprograma si el horario existente viola descanso de pareja o dependencia
 * de cruces (ej. final al mismo tiempo que la semi que la alimenta).
 */
export async function programarPartidosLlavePendientes(
  torneoId: string,
): Promise<number> {
  const PLAYOFF = [
    "PRELIMINARES",
    "OCTAVOS",
    "CUARTOS",
    "SEMIS",
    "FINAL",
    "LLAVE",
    "16AVOS",
    "32AVOS",
  ];

  const { data: partidos } = await supabaseAdmin
    .from("partidos")
    .select(
      "id, ronda, orden, equipo_a_id, equipo_b_id, estado_partido, cancha_asignada, fecha_partido",
    )
    .eq("torneo_id", torneoId)
    .in("ronda", PLAYOFF);

  if (!partidos?.length) return 0;

  const { count: pairCount } = await supabaseAdmin
    .from("inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("torneo_id", torneoId)
    .eq("estado_pago", "Confirmado");

  const { getFapBracketForPairCount } = await import("./fapBracketMatrices");
  const matrix = getFapBracketForPairCount(pairCount ?? 0) || [];
  const feedersByMatchNo = buildFeedersByMatchNo(matrix);

  const { duracionMinutos: configurada } =
    await cargarContextoProgramacion(torneoId);
  const duracionMinutos = duracionParaFase(configurada, "llave");

  const { data: todos } = await supabaseAdmin
    .from("partidos")
    .select(
      "id, cancha_asignada, fecha_partido, equipo_a_id, equipo_b_id, ronda, orden, estado_partido",
    )
    .eq("torneo_id", torneoId);

  const todosProg = (todos || []) as PartidoProgramable[];

  const violaFeederODescanso = (p: PartidoProgramable): boolean => {
    if (!p.fecha_partido) return false;
    const parsed = parseFechaPartidoIso(String(p.fecha_partido));
    if (!parsed) return true;

    const notBefore = notBeforeDesdeFeeders(
      p,
      todosProg,
      feedersByMatchNo,
      duracionMinutos,
    );
    for (const nb of notBefore) {
      if (parsed.fecha < nb.fecha) return true;
      if (parsed.fecha === nb.fecha && parsed.startMin < nb.startMin) {
        return true;
      }
    }

    const ids = equiposDePartido(p);
    for (const id of ids) {
      const historial: PartidoParejaHistorial[] = [];
      for (const other of todosProg) {
        if (other === p || !other.fecha_partido) continue;
        const oIds = equiposDePartido(other);
        if (!oIds.includes(id)) continue;
        const op = parseFechaPartidoIso(String(other.fecha_partido));
        if (!op) continue;
        historial.push({
          fecha: op.fecha,
          startMin: op.startMin,
          endMin: op.startMin + duracionMinutos,
        });
      }
      if (
        !parejaPuedeJugarEnSlot(
          historial,
          parsed.fecha,
          parsed.startMin,
          duracionMinutos,
        )
      ) {
        return true;
      }
    }
    return false;
  };

  const pendientes = partidos.filter((p) => {
    if (!p.equipo_a_id || !p.equipo_b_id) return false;
    if (String(p.estado_partido || "").toLowerCase().includes("pendiente")) {
      return false;
    }
    if (!p.cancha_asignada || !p.fecha_partido) return true;
    return violaFeederODescanso(p as PartidoProgramable);
  });
  if (!pendientes.length) return 0;

  // Limpiar horarios inválidos para reasignar
  for (const p of pendientes) {
    if (p.cancha_asignada || p.fecha_partido) {
      await supabaseAdmin
        .from("partidos")
        .update({ cancha_asignada: null, fecha_partido: null })
        .eq("id", p.id);
      p.cancha_asignada = null;
      p.fecha_partido = null;
    }
  }

  const ocupados = buildOcupadosDesdePartidos(
    (todos || []).filter(
      (t) => !pendientes.some((pend) => pend.id === t.id),
    ),
  );
  const yaProgramados = (todos || [])
    .filter(
      (p) =>
        p.cancha_asignada &&
        p.fecha_partido &&
        !pendientes.some((pend) => pend.id === p.id),
    )
    .map((p) => ({ ...p }));
  const drafts: PartidoProgramable[] = pendientes.map((p) => ({
    ...p,
    cancha_asignada: null,
    fecha_partido: null,
  }));
  const batch = [...yaProgramados, ...drafts];

  await programarPartidosConDisponibilidad(torneoId, batch, {
    ocupados,
    fase: "llave",
    feedersByMatchNo,
  });

  let updated = 0;
  for (let i = 0; i < pendientes.length; i++) {
    const draft = drafts[i];
    if (!draft.cancha_asignada || !draft.fecha_partido) continue;
    await supabaseAdmin
      .from("partidos")
      .update({
        cancha_asignada: draft.cancha_asignada,
        fecha_partido: draft.fecha_partido,
      })
      .eq("id", pendientes[i].id);
    updated++;
  }
  return updated;
}

/**
 * Programa partidos de zona (incl. G/P recién rellenados) sin cancha/hora.
 */
export async function programarPartidosZonaPendientes(
  torneoId: string,
  nombreZona?: string,
): Promise<number> {
  let query = supabaseAdmin
    .from("partidos")
    .select(
      "id, ronda, orden, equipo_a_id, equipo_b_id, estado_partido, cancha_asignada, fecha_partido",
    )
    .eq("torneo_id", torneoId)
    .ilike("ronda", "Zona %");

  if (nombreZona) {
    query = query.eq("ronda", nombreZona);
  }

  const { data: partidosZona } = await query;
  if (!partidosZona?.length) return 0;

  const pendientes = partidosZona.filter((p) => {
    if (p.cancha_asignada && p.fecha_partido) return false;
    if (esPendienteZona(p as PartidoProgramable)) return true;
    return Boolean(p.equipo_a_id && p.equipo_b_id);
  });
  if (!pendientes.length) return 0;

  const { data: todos } = await supabaseAdmin
    .from("partidos")
    .select(
      "id, cancha_asignada, fecha_partido, equipo_a_id, equipo_b_id, ronda, orden, estado_partido",
    )
    .eq("torneo_id", torneoId);

  const ocupados = buildOcupadosDesdePartidos(todos || []);
  const drafts: PartidoProgramable[] = (todos || []).map((p) => ({ ...p }));

  await programarPartidosConDisponibilidad(torneoId, drafts, {
    ocupados,
    fase: "zonas",
  });

  let updated = 0;
  const pendIds = new Set(pendientes.map((p) => p.id));
  for (const draft of drafts) {
    const id = (draft as { id?: string }).id;
    if (!id || !pendIds.has(id)) continue;
    if (!draft.cancha_asignada || !draft.fecha_partido) continue;
    await supabaseAdmin
      .from("partidos")
      .update({
        cancha_asignada: draft.cancha_asignada,
        fecha_partido: draft.fecha_partido,
      })
      .eq("id", id);
    updated++;
  }
  return updated;
}
