import * as XLSX from "xlsx";
import { usarPlanillaInscripcionFap } from "@/utils/constants/fapApaRules";

export type TipoPlanillaInscripcion = "fap" | "general";

export interface FilaPlanillaInscripcion {
  fila: number;
  letraOrden?: string;
  asociacion?: string;
  apellidoNombre: string;
  dni: string;
  fechaNacimiento?: string;
  categoria?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  localidadResidencia?: string;
  provinciaResidencia?: string;
}

export const ARCHIVO_PLANTILLA_FEDERACION_NACIONAL =
  "PLANILLA - FED NACIONAL.xls";
export const ARCHIVO_PLANTILLA_CLUB_ASOC_PROVINCIAL =
  "PLANILLA - CLUB - ASOC PCIAL.xls";

export interface ParsePlanillaResult {
  tipo: TipoPlanillaInscripcion;
  filas: FilaPlanillaInscripcion[];
}

export function sanearValorCeldaPlanilla(valor: unknown): string {
  let s = String(valor ?? "").trim();
  s = s.replace(/<\/?v\s*>/gi, "");
  s = s.replace(/^<v\s*/i, "");
  s = s.replace(/<[^>]*>/g, "");
  s = s.replace(/^>\s*/, "");
  return s.replace(/\s+/g, " ").trim();
}

function normalizarTexto(valor: unknown): string {
  return sanearValorCeldaPlanilla(valor);
}

export function normalizarEmailCeldaPlanilla(
  raw?: unknown,
): string | undefined {
  const s = sanearValorCeldaPlanilla(raw);
  if (!s) return undefined;
  const email = s.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return email;
}

function normalizarDni(valor: unknown): string {
  return normalizarTexto(valor).replace(/[^\d]/g, "");
}

function normalizarLetraOrden(valor: unknown): string | undefined {
  const raw = normalizarTexto(valor);
  if (!raw) return undefined;
  if (/^\d+(\.0)?$/.test(raw)) return String(parseInt(raw, 10));
  return raw.toUpperCase();
}

function parseFechaPlanilla(valor: unknown): string | undefined {
  const raw = normalizarTexto(valor);
  if (!raw) return undefined;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slash) {
    const dd = slash[1].padStart(2, "0");
    const mm = slash[2].padStart(2, "0");
    let yyyy = slash[3];
    if (yyyy.length === 2) yyyy = `19${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof valor === "number" && valor > 20000 && valor < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(valor));
    return epoch.toISOString().slice(0, 10);
  }

  return undefined;
}

function detectarTipoPlanilla(headerRow: string[]): TipoPlanillaInscripcion {
  const joined = headerRow.join(" ").toUpperCase();
  if (joined.includes("LETRA")) return "fap";
  if (joined.includes("PAREJAS")) return "general";
  return "general";
}

export function parseLocalidadProvinciaCelda(valor: unknown): {
  localidad?: string;
  provincia?: string;
} {
  const raw = normalizarTexto(valor);
  if (!raw) return {};

  const parts = raw
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      localidad: parts[0],
      provincia: parts[parts.length - 1],
    };
  }
  if (parts.length === 1) {
    return { provincia: parts[0] };
  }
  return {};
}

function indiceColumna(headerRow: string[], patron: RegExp): number {
  return headerRow.findIndex((cell) => patron.test(cell.toUpperCase()));
}

export function parsearFilasPlanilla(matrix: unknown[][]): ParsePlanillaResult {
  let headerIndex = -1;
  let headerRow: string[] = [];

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i].map((c) => normalizarTexto(c));
    if (row.some((c) => /DNI/i.test(c))) {
      headerIndex = i;
      headerRow = row;
      break;
    }
  }

  if (headerIndex < 0) {
    throw new Error(
      "No se encontró la fila de encabezados (DNI) en la planilla.",
    );
  }

  const tipo = detectarTipoPlanilla(headerRow);
  const idxLetraOrden = indiceColumna(headerRow, /LETRA|ORDEN|PAREJAS/);
  const idxAsociacion = indiceColumna(headerRow, /ASOCIACI/);
  const idxNombre = indiceColumna(headerRow, /APELLIDO|NOMBRE/);
  const idxDni = indiceColumna(headerRow, /DNI/);
  const idxFecha = indiceColumna(headerRow, /FECHA/);
  const idxCategoria = indiceColumna(headerRow, /CATEGOR/);
  const idxEmail = indiceColumna(headerRow, /EMAIL|CORREO|MAIL/);
  const idxTelefono = indiceColumna(headerRow, /TELEFONO|TEL/);
  const idxDireccion = indiceColumna(headerRow, /DIRECC/);
  const idxLocalidadProvincia = indiceColumna(
    headerRow,
    /LCOALIDAD|LOCALIDAD.*PROVINCIA/,
  );

  const filas: FilaPlanillaInscripcion[] = [];
  /** En planillas FAP, LETRA/ASOCIACIÓN suelen venir solo en la 1ª fila de la pareja. */
  let ultimaLetra: string | undefined;
  let ultimaAsociacion: string | undefined;

  for (let r = headerIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const apellidoNombre = normalizarTexto(
      idxNombre >= 0 ? row[idxNombre] : "",
    );
    const dni = normalizarDni(idxDni >= 0 ? row[idxDni] : "");

    if (!apellidoNombre && !dni) continue;

    const letraRaw =
      idxLetraOrden >= 0
        ? normalizarLetraOrden(row[idxLetraOrden])
        : undefined;
    if (letraRaw) ultimaLetra = letraRaw;

    const asociacionRaw =
      idxAsociacion >= 0
        ? normalizarTexto(row[idxAsociacion]) || undefined
        : undefined;
    if (asociacionRaw) ultimaAsociacion = asociacionRaw;

    const { localidad, provincia } =
      idxLocalidadProvincia >= 0
        ? parseLocalidadProvinciaCelda(row[idxLocalidadProvincia])
        : {};

    let direccion =
      idxDireccion >= 0
        ? normalizarTexto(row[idxDireccion]) || undefined
        : undefined;

    if (!direccion && (localidad || provincia)) {
      if (localidad && provincia) {
        direccion = `${localidad}, ${provincia}`;
      } else {
        direccion = localidad || provincia;
      }
    }

    filas.push({
      fila: r + 1,
      letraOrden: letraRaw || ultimaLetra,
      asociacion: asociacionRaw || ultimaAsociacion,
      apellidoNombre,
      dni,
      fechaNacimiento:
        idxFecha >= 0 ? parseFechaPlanilla(row[idxFecha]) : undefined,
      categoria:
        idxCategoria >= 0
          ? normalizarTexto(row[idxCategoria]) || undefined
          : undefined,
      email:
        idxEmail >= 0
          ? normalizarEmailCeldaPlanilla(row[idxEmail])
          : undefined,
      telefono:
        idxTelefono >= 0
          ? normalizarTexto(row[idxTelefono]) || undefined
          : undefined,
      direccion,
      localidadResidencia: localidad,
      provinciaResidencia: provincia,
    });
  }

  return { tipo, filas };
}

export async function leerPlanillaDesdeArchivo(
  file: File,
): Promise<ParsePlanillaResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El archivo no contiene hojas de cálculo.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  return parsearFilasPlanilla(matrix);
}

export function urlPlantillaInscripcion(torneo: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}): string {
  const esFap = usarPlanillaInscripcionFap(torneo);
  const archivo = esFap
    ? ARCHIVO_PLANTILLA_FEDERACION_NACIONAL
    : ARCHIVO_PLANTILLA_CLUB_ASOC_PROVINCIAL;
  return `/plantillas/inscripciones/${encodeURIComponent(archivo)}`;
}

export function nombrePlantillaInscripcion(torneo: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}): string {
  const esFap = usarPlanillaInscripcionFap(torneo);
  return esFap
    ? "Planilla de inscripción · Federación Nacional.xls"
    : "Planilla de inscripción · Clubes y asociaciones.xls";
}

/** Cuentas creadas al importar planilla (sin mail personal del jugador). */
export function esEmailPlaceholderPlanilla(
  email: string | null | undefined,
): boolean {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return true;
  if (e.includes("@padelnexus.local")) return true;
  if (/@example\.com$/i.test(e)) return true;
  if (/^preinscripto\+/i.test(e)) return true;
  return false;
}

/** Email mostrable en CRM; null si es cuenta técnica de planilla. */
export function emailContactoVisible(
  email: string | null | undefined,
): string | null {
  if (esEmailPlaceholderPlanilla(email)) return null;
  const e = String(email || "").trim();
  return e || null;
}

export function etiquetaTipoPlanillaInscripcion(torneo: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}): string {
  return usarPlanillaInscripcionFap(torneo)
    ? "Federación Nacional"
    : "Clubes y asociaciones";
}

export function descargarPlantillaInscripcion(torneo: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}) {
  const url = urlPlantillaInscripcion(torneo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombrePlantillaInscripcion(torneo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
