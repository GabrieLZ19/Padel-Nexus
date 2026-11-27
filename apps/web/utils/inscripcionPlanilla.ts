import * as XLSX from "xlsx";
import { usarPlanillaInscripcionFap } from "@/utils/constants/fapApaRules";
import {
  inferirProvinciaDesdeLocalidadWeb,
  provinciaCanonicaArgentinaWeb,
} from "@/utils/localidadProvinciaArgentina";

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

export interface OpcionesParsearFilasPlanilla {
  filaInicioExcel?: number;
}

export function filaInicioExcelDesdeSheetRef(ref?: string | null): number {
  const raw = String(ref ?? "").trim();
  if (!raw) return 1;
  const celdaInicio = raw.split(":")[0] ?? raw;
  const match = /^[A-Za-z]+(\d+)/.exec(celdaInicio);
  if (!match) return 1;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
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

function partesLocalidadProvincia(raw: string): string[] {
  if (raw.includes("|")) {
    return raw
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
  }
  const coma = raw.indexOf(",");
  if (coma >= 0) {
    const localidad = raw.slice(0, coma).trim();
    const provincia = raw.slice(coma + 1).trim();
    if (localidad && provincia) return [localidad, provincia];
  }
  const trimmed = raw.trim();
  return trimmed ? [trimmed] : [];
}

export function parseLocalidadProvinciaCelda(valor: unknown): {
  localidad?: string;
  provincia?: string;
} {
  const raw = normalizarTexto(valor);
  if (!raw) return {};

  const parts = partesLocalidadProvincia(raw);

  if (parts.length >= 2) {
    const provinciaRaw = parts[parts.length - 1];
    const provinciaCanon =
      provinciaCanonicaArgentinaWeb(provinciaRaw) ?? provinciaRaw;
    return {
      localidad: parts[0],
      provincia: provinciaCanon,
    };
  }
  if (parts.length === 1) {
    const token = parts[0];
    const provinciaCanon = provinciaCanonicaArgentinaWeb(token);
    if (provinciaCanon) return { provincia: provinciaCanon };
    const inferida = inferirProvinciaDesdeLocalidadWeb(token);
    if (inferida) return { localidad: token, provincia: inferida };
    return { localidad: token };
  }
  return {};
}

function indiceColumna(headerRow: string[], patron: RegExp): number {
  return headerRow.findIndex((cell) => patron.test(cell.toUpperCase()));
}

export function esFilaEncabezadoPlanilla(row: string[]): boolean {
  const hasDni = row.some((c) => /^DNI$/i.test(String(c).trim()));
  if (!hasDni) return false;
  const joined = row.join(" ").toUpperCase();
  return /APELLIDO|NOMBRE/.test(joined) || /PAREJAS/.test(joined);
}

function parseNombreCompleto(apellidoNombre: string): {
  apellido: string;
  nombre: string;
} {
  const limpio = normalizarTexto(apellidoNombre);
  if (!limpio) return { apellido: "", nombre: "" };
  if (limpio.includes(",")) {
    const [ap, ...rest] = limpio.split(",");
    return {
      apellido: normalizarTexto(ap),
      nombre: normalizarTexto(rest.join(",")),
    };
  }
  const partes = limpio.split(" ");
  if (partes.length === 1) {
    return { apellido: partes[0], nombre: partes[0] };
  }
  return { apellido: partes[0], nombre: partes.slice(1).join(" ") };
}

export function etiquetaFilaPlanillaExcel(fila: number): string {
  return `Fila ${fila}`;
}

export function errorDniFilaPlanilla(
  fila: FilaPlanillaInscripcion,
): string | null {
  const dni = normalizarDni(fila.dni);
  const etiqueta = etiquetaFilaPlanillaExcel(fila.fila);
  if (!dni) {
    return `${etiqueta}: el DNI está vacío; completalo en la planilla.`;
  }
  if (dni.length < 7) {
    return `${etiqueta}: el DNI "${dni}" tiene menos de 7 dígitos; corregilo en la planilla.`;
  }
  return null;
}

export function advertenciaNombreSinComaPlanilla(
  fila: FilaPlanillaInscripcion,
): string | null {
  const raw = sanearValorCeldaPlanilla(fila.apellidoNombre);
  if (!raw || raw.includes(",")) return null;
  const { apellido, nombre } = parseNombreCompleto(raw);
  const vista = `${apellido}, ${nombre}`;
  return `${etiquetaFilaPlanillaExcel(fila.fila)}: el nombre no incluye coma (formato esperado «Apellido, Nombre»). Se interpretará como «${vista}».`;
}

export function agruparFilasEnParejas(
  filas: FilaPlanillaInscripcion[],
): Array<{ j1: FilaPlanillaInscripcion; j2?: FilaPlanillaInscripcion }> {
  const grupos: Array<{
    j1: FilaPlanillaInscripcion;
    j2?: FilaPlanillaInscripcion;
  }> = [];
  for (let i = 0; i < filas.length; i += 2) {
    grupos.push({ j1: filas[i], j2: filas[i + 1] });
  }
  return grupos;
}

function mapaDnisDuplicadosPlanilla(
  filas: FilaPlanillaInscripcion[],
): Map<string, number[]> {
  const porDni = new Map<string, number[]>();
  for (const fila of filas) {
    const dni = normalizarDni(fila.dni);
    if (dni.length < 7) continue;
    const lista = porDni.get(dni) ?? [];
    lista.push(fila.fila);
    porDni.set(dni, lista);
  }
  return porDni;
}

export interface ResultadoValidacionPlanilla {
  errores: string[];
  advertencias: string[];
}

export function validarEstructuraPlanillaAntesImport(
  filas: FilaPlanillaInscripcion[],
  individual: boolean,
): ResultadoValidacionPlanilla {
  const errores: string[] = [];
  const advertencias: string[] = [];
  const dnisDuplicados = mapaDnisDuplicadosPlanilla(filas);

  for (const fila of filas) {
    const errDni = errorDniFilaPlanilla(fila);
    if (errDni) errores.push(errDni);
    const advNombre = advertenciaNombreSinComaPlanilla(fila);
    if (advNombre) advertencias.push(advNombre);
    if (!sanearValorCeldaPlanilla(fila.apellidoNombre)) {
      errores.push(
        `${etiquetaFilaPlanillaExcel(fila.fila)}: falta apellido y nombre.`,
      );
    }
    const dni = normalizarDni(fila.dni);
    const filasDup = dnisDuplicados.get(dni);
    if (dni.length >= 7 && filasDup && filasDup.length > 1) {
      const otras = filasDup.filter((n) => n !== fila.fila);
      errores.push(
        `${etiquetaFilaPlanillaExcel(fila.fila)}: DNI ${dni} repetido (también en fila ${otras.join(", ")}).`,
      );
    }
  }

  if (!individual) {
    const grupos = agruparFilasEnParejas(filas);
    const clavesPareja = new Map<string, string[]>();
    for (const grupo of grupos) {
      if (!grupo.j2) {
        errores.push(
          `${etiquetaFilaPlanillaExcel(grupo.j1.fila)}: la pareja quedó incompleta (falta el segundo jugador).`,
        );
        continue;
      }
      const d1 = normalizarDni(grupo.j1.dni);
      const d2 = normalizarDni(grupo.j2.dni);
      if (d1.length < 7 || d2.length < 7) continue;
      const key = [d1, d2].sort().join("|");
      const ref = `Filas ${grupo.j1.fila} y ${grupo.j2.fila}`;
      const lista = clavesPareja.get(key) ?? [];
      lista.push(ref);
      clavesPareja.set(key, lista);
    }
    for (const refs of clavesPareja.values()) {
      if (refs.length > 1) {
        errores.push(
          `Pareja duplicada (${refs.join("; ")}): los mismos dos DNI aparecen más de una vez.`,
        );
      }
    }
  }

  return { errores, advertencias };
}

export function parsearFilasPlanilla(
  matrix: unknown[][],
  opciones?: OpcionesParsearFilasPlanilla,
): ParsePlanillaResult {
  const filaInicioExcel = opciones?.filaInicioExcel ?? 1;
  let headerIndex = -1;
  let headerRow: string[] = [];

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i].map((c) => normalizarTexto(c));
    if (esFilaEncabezadoPlanilla(row)) {
      headerIndex = i;
      headerRow = row;
      break;
    }
  }

  if (headerIndex < 0) {
    throw new Error("No se encontró el encabezado de la planilla.");
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
      fila: filaInicioExcel + r,
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
  const filaInicioExcel = filaInicioExcelDesdeSheetRef(sheet["!ref"]);
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  return parsearFilasPlanilla(matrix, { filaInicioExcel });
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

export async function descargarPlantillaInscripcion(torneo: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}): Promise<void> {
  const url = urlPlantillaInscripcion(torneo);
  const nombre = nombrePlantillaInscripcion(torneo);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("No se pudo descargar la planilla de inscripción.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
