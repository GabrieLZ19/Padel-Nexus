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

export function expandirSlotsDisponibilidad(
  disponibilidad: DisponibilidadTorneo[],
  duracionMinutos: number,
): SlotProgramacion[] {
  const duracion = Math.max(30, duracionMinutos || 90);
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
    const inicio = parseHoraAMinutos(bloque.hora_inicio);
    const finConfigurado = bloque.hora_fin
      ? parseHoraAMinutos(bloque.hora_fin)
      : inicio + duracion;
    const fin = finConfigurado > inicio ? finConfigurado : inicio + duracion;

    for (let minuto = inicio; minuto + duracion <= fin; minuto += duracion) {
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

export async function programarPartidosConDisponibilidad(
  torneoId: string,
  partidos: PartidoProgramable[],
  opciones?: { ocupados?: Set<string> },
): Promise<void> {
  const { duracionMinutos, disponibilidad } =
    await cargarContextoProgramacion(torneoId);
  if (!disponibilidad.length) return;

  const slots = expandirSlotsDisponibilidad(disponibilidad, duracionMinutos);
  asignarHorariosAPartidos(partidos, slots, opciones?.ocupados);
}
