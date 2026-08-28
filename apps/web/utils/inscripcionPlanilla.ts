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
}

export interface ParsePlanillaResult {
  tipo: TipoPlanillaInscripcion;
  filas: FilaPlanillaInscripcion[];
}

function normalizarTexto(valor: unknown): string {
  return String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ");
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
  return "general";
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
  const idxLetraOrden = indiceColumna(headerRow, /LETRA|ORDEN/);
  const idxAsociacion = indiceColumna(headerRow, /ASOCIACI/);
  const idxNombre = indiceColumna(headerRow, /APELLIDO|NOMBRE/);
  const idxDni = indiceColumna(headerRow, /DNI/);
  const idxFecha = indiceColumna(headerRow, /FECHA/);
  const idxCategoria = indiceColumna(headerRow, /CATEGOR/);
  const idxEmail = indiceColumna(headerRow, /EMAIL|CORREO|MAIL/);
  const idxTelefono = indiceColumna(headerRow, /TELEFONO|TEL/);
  const idxDireccion = indiceColumna(headerRow, /DIRECC/);

  const filas: FilaPlanillaInscripcion[] = [];

  for (let r = headerIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const apellidoNombre = normalizarTexto(
      idxNombre >= 0 ? row[idxNombre] : "",
    );
    const dni = normalizarDni(idxDni >= 0 ? row[idxDni] : "");

    if (!apellidoNombre && !dni) continue;

    filas.push({
      fila: r + 1,
      letraOrden:
        idxLetraOrden >= 0
          ? normalizarLetraOrden(row[idxLetraOrden])
          : undefined,
      asociacion:
        idxAsociacion >= 0
          ? normalizarTexto(row[idxAsociacion]) || undefined
          : undefined,
      apellidoNombre,
      dni,
      fechaNacimiento:
        idxFecha >= 0 ? parseFechaPlanilla(row[idxFecha]) : undefined,
      categoria:
        idxCategoria >= 0
          ? normalizarTexto(row[idxCategoria]) || undefined
          : undefined,
      email:
        idxEmail >= 0 ? normalizarTexto(row[idxEmail]) || undefined : undefined,
      telefono:
        idxTelefono >= 0
          ? normalizarTexto(row[idxTelefono]) || undefined
          : undefined,
      direccion:
        idxDireccion >= 0
          ? normalizarTexto(row[idxDireccion]) || undefined
          : undefined,
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
  return esFap
    ? "/plantillas/inscripciones/planilla-fap-arg.xls"
    : "/plantillas/inscripciones/planilla-generales.xls";
}

export function nombrePlantillaInscripcion(torneo: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}): string {
  const esFap = usarPlanillaInscripcionFap(torneo);
  return esFap
    ? "Planilla de Inscripciones FAP ARG.xls"
    : "Planilla de Inscripciones Generales.xls";
}

export function etiquetaTipoPlanillaInscripcion(torneo: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}): string {
  return usarPlanillaInscripcionFap(torneo) ? "FAP ARG" : "Generales";
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
