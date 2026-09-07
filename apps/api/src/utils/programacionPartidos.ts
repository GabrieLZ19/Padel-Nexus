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

function buildFechaIso(fecha: string, minutosDesdeMedianoche: number): string {
  const [yyyy, mm, dd] = normalizarFecha(fecha).split("-").map(Number);
  const h = Math.floor(minutosDesdeMedianoche / 60);
  const m = minutosDesdeMedianoche % 60;
  return new Date(yyyy, mm - 1, dd, h, m, 0).toISOString();
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

/** Ventana FAP: no programar antes de 09:00 ni después de 22:00 (inicio). */
export const FAP_HORA_INICIO_MIN = 9 * 60;
export const FAP_HORA_INICIO_MAX = 22 * 60;

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

function esPartidoProgramable(p: PartidoProgramable): boolean {
  if (!p.equipo_a_id || !p.equipo_b_id) return false;
  const estado = String(p.estado_partido || "").toLowerCase();
  return !estado.includes("pendiente");
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

    try {
      const d = new Date(partido.fecha_partido);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      ocupados.add(slotKey(cancha, `${yyyy}-${mm}-${dd}`, `${hh}:${mins}:00`));
    } catch {
      // Ignorar fechas inválidas
    }
  }

  return ocupados;
}

export function asignarHorariosAPartidos(
  partidos: PartidoProgramable[],
  slots: SlotProgramacion[],
  ocupadosIniciales?: Set<string>,
): void {
  if (!slots.length || !partidos.length) return;

  const ocupados = new Set(ocupadosIniciales || []);
  const indices = partidos
    .map((partido, index) => ({ partido, index }))
    .filter(({ partido }) => esPartidoProgramable(partido))
    .sort((a, b) => {
      const peso =
        pesoRonda(a.partido.ronda || "") - pesoRonda(b.partido.ronda || "");
      if (peso !== 0) return peso;
      return (a.partido.orden || 0) - (b.partido.orden || 0);
    });

  let slotIndex = 0;

  for (const { index } of indices) {
    while (slotIndex < slots.length) {
      const slot = slots[slotIndex++];
      const key = slotKey(slot.canchaLabel, slot.fecha, slot.hora);
      if (ocupados.has(key)) continue;

      ocupados.add(key);
      partidos[index].cancha_asignada = slot.canchaLabel;
      partidos[index].fecha_partido = slot.fechaIso;
      break;
    }
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
  },
): Promise<void> {
  const { duracionMinutos: configurada, disponibilidad } =
    await cargarContextoProgramacion(torneoId);
  if (!disponibilidad.length) return;

  const fase = opciones?.fase || "zonas";
  const duracionMinutos =
    opciones?.duracionMinutos ?? duracionParaFase(configurada, fase);

  const slots = expandirSlotsDisponibilidad(disponibilidad, duracionMinutos);
  asignarHorariosAPartidos(partidos, slots, opciones?.ocupados);
}

/**
 * Programa partidos de llave que ya tienen ambos equipos y aún no tienen cancha/hora.
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

  const pendientes = partidos.filter(
    (p) =>
      p.equipo_a_id &&
      p.equipo_b_id &&
      !p.cancha_asignada &&
      !String(p.estado_partido || "").toLowerCase().includes("pendiente"),
  );
  if (!pendientes.length) return 0;

  const { data: todos } = await supabaseAdmin
    .from("partidos")
    .select("cancha_asignada, fecha_partido")
    .eq("torneo_id", torneoId);

  const ocupados = buildOcupadosDesdePartidos(todos || []);
  const drafts: PartidoProgramable[] = pendientes.map((p) => ({ ...p }));
  await programarPartidosConDisponibilidad(torneoId, drafts, {
    ocupados,
    fase: "llave",
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
