/**
 * Reglas del programador visual (paso 5).
 * Los códigos de ronda guardados no cambian; acá solo se etiquetan y se ordenan.
 */

export type ModoDescanso = "tras_fin_60" | "tras_fin_120" | "entre_inicios_240";

export type DistribucionProgramacion = "zonas_primero" | "continua";

const MODOS_DESCANSO: ModoDescanso[] = [
  "tras_fin_60",
  "tras_fin_120",
  "entre_inicios_240",
];

const ETIQUETAS_LLAVE: Record<string, string> = {
  "32AVOS": "Treintaidosavos de final",
  "16AVOS": "Dieciseisavos de final",
  OCTAVOS: "Octavos de final",
  CUARTOS: "Cuartos de final",
  SEMIS: "Semifinales",
  SEMIFINAL: "Semifinales",
  SEMIFINALES: "Semifinales",
  FINAL: "Final",
  PRELIMINARES: "Dieciseisavos de final",
  PRELIMINAR: "Dieciseisavos de final",
};

const ORDEN_LLAVE: Record<string, number> = {
  PRELIMINARES: 110,
  PRELIMINAR: 110,
  "32AVOS": 100,
  "16AVOS": 110,
  OCTAVOS: 120,
  CUARTOS: 130,
  SEMIS: 140,
  SEMIFINAL: 140,
  SEMIFINALES: 140,
  FINAL: 150,
};

export function esModoDescanso(value: unknown): value is ModoDescanso {
  return MODOS_DESCANSO.includes(value as ModoDescanso);
}

export function esDistribucionProgramacion(
  value: unknown,
): value is DistribucionProgramacion {
  return value === "zonas_primero" || value === "continua";
}

export function esRondaDeZona(ronda?: string | null): boolean {
  return /^ZONA\s+/i.test(String(ronda || "").trim());
}

function compactarRonda(ronda?: string | null): string {
  return String(ronda || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** Nombre visible. Las zonas conservan su letra; la llave va en español completo. */
export function etiquetaRondaProgramador(ronda?: string | null): string {
  const raw = String(ronda || "").trim();
  if (!raw) return "Partido";
  if (esRondaDeZona(raw)) {
    return raw.replace(/^zona/i, "Zona");
  }
  return ETIQUETAS_LLAVE[compactarRonda(raw)] || raw;
}

/**
 * Orden de lectura: zonas (A, B, C…), luego treintaidosavos → dieciseisavos →
 * octavos → cuartos → semifinales → final.
 */
export function ordenRondaProgramador(ronda?: string | null): number {
  const raw = String(ronda || "").trim();
  const zona = raw.toUpperCase().match(/^ZONA\s+([A-Z0-9]+)/);
  if (zona) {
    const code = zona[1].charCodeAt(0);
    return code >= 65 && code <= 90 ? code - 65 : 40;
  }
  return ORDEN_LLAVE[compactarRonda(raw)] ?? 200;
}

export function minutosDeModoDescanso(modo: ModoDescanso): number {
  if (modo === "tras_fin_120") return 120;
  if (modo === "entre_inicios_240") return 240;
  return 60;
}

/**
 * true cuando dos inicios del mismo día no cumplen el descanso elegido.
 * `tras_fin_*` mide desde el final estimado. `entre_inicios_240` mide de inicio a inicio.
 */
export function evaluarDescansoInsuficiente(
  modo: ModoDescanso,
  inicioA: number,
  inicioB: number,
  duracion: number,
): boolean {
  const delta = Math.abs(inicioA - inicioB);
  if (delta === 0) return true;
  if (modo === "entre_inicios_240") return delta < 240;
  return delta - duracion < minutosDeModoDescanso(modo);
}

/** 1 a 4 fechas corridas desde el inicio del torneo. */
export function jornadasDesdeInicio(
  fechaIso: string,
  cantidad: number,
): string[] {
  const n = Math.min(4, Math.max(1, Math.floor(cantidad) || 1));
  const iso = String(fechaIso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return [];
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (Number.isNaN(base.getTime())) return [];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    out.push(`${yy}-${mm}-${dd}`);
  }
  return out;
}

export function minutosDesdeHora(hora?: string | null): number | null {
  const match = String(hora || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * La ronda de clasificación tiene que terminar a las 11:00 del día siguiente
 * al inicio. true si el fin estimado cae después de ese límite.
 * `fechaPartido` y `startMin` son hora local de la grilla, no UTC.
 */
export function clasificacionSuperaLimiteLocal(input: {
  fechaInicio: string;
  fechaPartido: string;
  startMin: number;
  duracionMinutos: number;
}): boolean {
  const inicio = String(input.fechaInicio || "").slice(0, 10);
  const fecha = String(input.fechaPartido || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }
  const [y, m, d] = inicio.split("-").map(Number);
  const limite = new Date(y, m - 1, d, 11, 0, 0, 0);
  limite.setDate(limite.getDate() + 1);
  const [py, pm, pd] = fecha.split("-").map(Number);
  const partido = new Date(py, pm - 1, pd, 0, 0, 0, 0);
  partido.setMinutes(Math.max(0, input.startMin));
  const fin = partido.getTime() + Math.max(0, input.duracionMinutos) * 60_000;
  return fin > limite.getTime();
}

export function clasificacionSuperaLimite(
  fechaInicio: string,
  fechaPartidoIso: string,
  duracionMinutos: number,
): boolean {
  const match = String(fechaPartidoIso || "").match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/,
  );
  if (!match) return false;
  const [h, min] = [Number(match[2]), Number(match[3])];
  return clasificacionSuperaLimiteLocal({
    fechaInicio,
    fechaPartido: match[1],
    startMin: h * 60 + min,
    duracionMinutos,
  });
}

export function sugerirCanchasYHoras(input: {
  partidos: number;
  duracionMinutos: number;
  jornadas: number;
}): { canchas: number; horas: number; mensaje: string } {
  const partidos = Math.max(0, Math.floor(input.partidos));
  const duracion = Math.max(30, input.duracionMinutos || 90);
  const jornadas = Math.min(4, Math.max(1, Math.floor(input.jornadas) || 1));
  if (partidos === 0) {
    return {
      canchas: 0,
      horas: 0,
      mensaje: "Todavía no hay partidos para estimar canchas y horas.",
    };
  }
  const ocupacion = partidos * duracion;
  // Primera jornada: 08:00 hasta las 11:00 del día siguiente (27 h).
  // Cada jornada extra suma la grilla de 08:00 a 21:00 (13 h).
  const ventana = 27 * 60 + (jornadas - 1) * 13 * 60;
  const canchas = Math.max(1, Math.ceil(ocupacion / ventana));
  const horas = Math.max(1, Math.ceil(ocupacion / canchas / 60));
  const mensaje = `Con ${partidos} partidos y turnos de ${duracion} min, necesitás como mínimo ${canchas} cancha${canchas === 1 ? "" : "s"} y ${horas} hora${horas === 1 ? "" : "s"}.`;
  return { canchas, horas, mensaje };
}

export function ordenDeAsignacion<
  T extends { ronda?: string | null; orden?: number | null },
>(partidos: T[], distribucion: DistribucionProgramacion): T[] {
  if (distribucion === "continua") {
    return [...partidos].sort(
      (a, b) =>
        (a.orden || 0) - (b.orden || 0) ||
        ordenRondaProgramador(a.ronda) - ordenRondaProgramador(b.ronda),
    );
  }
  const zonas = partidos
    .filter((p) => esRondaDeZona(p.ronda))
    .sort(
      (a, b) =>
        ordenRondaProgramador(a.ronda) - ordenRondaProgramador(b.ronda) ||
        (a.orden || 0) - (b.orden || 0),
    );
  const llave = partidos
    .filter((p) => !esRondaDeZona(p.ronda))
    .sort(
      (a, b) =>
        ordenRondaProgramador(a.ronda) - ordenRondaProgramador(b.ronda) ||
        (a.orden || 0) - (b.orden || 0),
    );
  return [...zonas, ...llave];
}
