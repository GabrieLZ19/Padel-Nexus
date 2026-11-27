import { inferirProvinciaDesdeLocalidad } from "./localidadProvinciaArgentina";
import { provinciaCanonicaArgentina } from "./provinciaRanking";

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
  /** Primera fila Excel que corresponde a `matrix[0]` (desde `!ref` del libro). */
  filaInicioExcel?: number;
}

/** Fila Excel 1-index del origen del rango usado (p. ej. `A5:H20` → 5). */
export function filaInicioExcelDesdeSheetRef(ref?: string | null): number {
  const raw = String(ref ?? "").trim();
  if (!raw) return 1;
  const celdaInicio = raw.split(":")[0] ?? raw;
  const match = /^[A-Za-z]+(\d+)/.exec(celdaInicio);
  if (!match) return 1;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Quita artefactos OOXML/HTML que a veces filtran desde celdas Excel (`<v>`, etc.). */
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

function normalizarDni(valor: unknown): string {
  return normalizarTexto(valor).replace(/[^\d]/g, "");
}

function normalizarLetraOrden(valor: unknown): string | undefined {
  const raw = normalizarTexto(valor);
  if (!raw) return undefined;
  if (/^\d+(\.0)?$/.test(raw)) return String(parseInt(raw, 10));
  return raw.toUpperCase();
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

  return {
    apellido: partes[0],
    nombre: partes.slice(1).join(" "),
  };
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

/** Columna `LOCALIDAD | PROVINCIA` (tolerando typo `LCOALIDAD` en planillas viejas). */
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
      provinciaCanonicaArgentina(provinciaRaw) ?? provinciaRaw;
    return {
      localidad: parts[0],
      provincia: provinciaCanon,
    };
  }
  if (parts.length === 1) {
    const token = parts[0];
    const provinciaCanon = provinciaCanonicaArgentina(token);
    if (provinciaCanon) return { provincia: provinciaCanon };
    const inferida = inferirProvinciaDesdeLocalidad(token);
    if (inferida) return { localidad: token, provincia: inferida };
    return { localidad: token };
  }
  return {};
}

function indiceColumna(headerRow: string[], patron: RegExp): number {
  return headerRow.findIndex((cell) => patron.test(cell.toUpperCase()));
}

/** Encabezado real: columna DNI + APELLIDO/NOMBRE o PAREJAS (TOR-55 / CLI-1). */
export function esFilaEncabezadoPlanilla(row: string[]): boolean {
  const hasDni = row.some((c) => /^DNI$/i.test(String(c).trim()));
  if (!hasDni) return false;
  const joined = row.join(" ").toUpperCase();
  return /APELLIDO|NOMBRE/.test(joined) || /PAREJAS/.test(joined);
}

/** Parsea filas crudas (array de arrays) exportadas desde la planilla XLS. */
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

/** Email de fila: válido y sin dominios técnicos/QA. */
export function normalizarEmailCeldaPlanilla(
  raw?: unknown,
): string | undefined {
  const s = sanearValorCeldaPlanilla(raw);
  if (!s) return undefined;
  const email = s.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return email;
}

/** Cuentas sin correo personal del jugador (placeholder o ensayo). */
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

export function sanitizarFilaPlanillaInscripcion(
  fila: FilaPlanillaInscripcion,
): FilaPlanillaInscripcion {
  return {
    ...fila,
    apellidoNombre: sanearValorCeldaPlanilla(fila.apellidoNombre),
    dni: normalizarDni(fila.dni),
    letraOrden: fila.letraOrden
      ? sanearValorCeldaPlanilla(fila.letraOrden)
      : undefined,
    asociacion: fila.asociacion
      ? sanearValorCeldaPlanilla(fila.asociacion)
      : undefined,
    categoria: fila.categoria
      ? sanearValorCeldaPlanilla(fila.categoria)
      : undefined,
    email: normalizarEmailCeldaPlanilla(fila.email),
    telefono: fila.telefono
      ? sanearValorCeldaPlanilla(fila.telefono)
      : undefined,
    direccion: fila.direccion
      ? sanearValorCeldaPlanilla(fila.direccion)
      : undefined,
    localidadResidencia: fila.localidadResidencia
      ? sanearValorCeldaPlanilla(fila.localidadResidencia)
      : undefined,
    provinciaResidencia: fila.provinciaResidencia
      ? sanearValorCeldaPlanilla(fila.provinciaResidencia)
      : undefined,
  };
}

/** Número de fila visible (1-indexed, como en Excel). */
export function etiquetaFilaPlanillaExcel(fila: number): string {
  return `Fila ${fila}`;
}

/** TOR-68: DNI vacío vs demasiado corto. */
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

/** TOR-68: aviso cuando el nombre no sigue «Apellido, Nombre». */
export function advertenciaNombreSinComaPlanilla(
  fila: FilaPlanillaInscripcion,
): string | null {
  const raw = sanearValorCeldaPlanilla(fila.apellidoNombre);
  if (!raw || raw.includes(",")) return null;
  const { apellido, nombre } = parseNombreCompleto(raw);
  const vista = `${apellido}, ${nombre}`;
  return `${etiquetaFilaPlanillaExcel(fila.fila)}: el nombre no incluye coma (formato esperado «Apellido, Nombre»). Se interpretará como «${vista}».`;
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

/** Validaciones estructurales previas a importar (sin tocar la base de datos). */
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

/** Errores de una pareja/fila que impiden resolver fichas (CLI-1 / TOR-68). */
export function erroresGrupoPlanillaImport(
  grupo: { j1: FilaPlanillaInscripcion; j2?: FilaPlanillaInscripcion },
  individual: boolean,
  filas: FilaPlanillaInscripcion[],
): string[] {
  const dnisDuplicados = mapaDnisDuplicadosPlanilla(filas);
  const out: string[] = [];

  const revisarJugador = (f: FilaPlanillaInscripcion) => {
    const errDni = errorDniFilaPlanilla(f);
    if (errDni) out.push(errDni);
    const dni = normalizarDni(f.dni);
    const dup = dnisDuplicados.get(dni);
    if (dni.length >= 7 && dup && dup.length > 1) {
      const otras = dup.filter((n) => n !== f.fila);
      out.push(
        `${etiquetaFilaPlanillaExcel(f.fila)}: DNI ${dni} repetido (también en fila ${otras.join(", ")}).`,
      );
    }
    if (!sanearValorCeldaPlanilla(f.apellidoNombre)) {
      out.push(
        `${etiquetaFilaPlanillaExcel(f.fila)}: falta apellido y nombre.`,
      );
    }
  };

  revisarJugador(grupo.j1);
  if (!individual) {
    if (grupo.j2) revisarJugador(grupo.j2);
    else {
      out.push(
        `${etiquetaFilaPlanillaExcel(grupo.j1.fila)}: la pareja quedó incompleta (falta el segundo jugador).`,
      );
    }
  }

  return [...new Set(out)];
}

export function agruparFilasEnParejas(
  filas: FilaPlanillaInscripcion[],
): Array<{ j1: FilaPlanillaInscripcion; j2?: FilaPlanillaInscripcion }> {
  const grupos: Array<{
    j1: FilaPlanillaInscripcion;
    j2?: FilaPlanillaInscripcion;
  }> = [];

  for (let i = 0; i < filas.length; i += 2) {
    grupos.push({
      j1: filas[i],
      j2: filas[i + 1],
    });
  }

  return grupos;
}

export {
  parseNombreCompleto,
  normalizarDni,
  resolverProvinciaDesdePlanilla,
  resolverLugarResidenciaDesdePlanilla,
  esResidenciaPlaceholder,
};

function esResidenciaPlaceholder(valor?: string | null): boolean {
  const v = String(valor || "")
    .trim()
    .toLowerCase();
  return !v || v === "a completar" || v.startsWith("a completar ");
}

/**
 * Provincia para ranking/denominación: ASOCIACIÓN (nacional), provincia explícita
 * o inferida desde localidad. No usa el nombre de localidad como provincia.
 */
function resolverProvinciaDesdePlanilla(
  fila: FilaPlanillaInscripcion,
): string | null {
  const asociacion = String(fila.asociacion || "")
    .trim()
    .replace(/\s+/g, " ");
  if (asociacion && !esResidenciaPlaceholder(asociacion)) {
    const canon = provinciaCanonicaArgentina(asociacion);
    return canon ?? asociacion;
  }

  const provinciaLoc = String(fila.provinciaResidencia || "")
    .trim()
    .replace(/\s+/g, " ");
  if (provinciaLoc && !esResidenciaPlaceholder(provinciaLoc)) {
    const canon = provinciaCanonicaArgentina(provinciaLoc);
    if (canon) return canon;
    const inferida = inferirProvinciaDesdeLocalidad(provinciaLoc);
    if (inferida) return inferida;
  }

  const localidad = String(fila.localidadResidencia || "")
    .trim()
    .replace(/\s+/g, " ");
  if (localidad && !esResidenciaPlaceholder(localidad)) {
    const inferida = inferirProvinciaDesdeLocalidad(localidad);
    if (inferida) return inferida;
  }

  return null;
}

/** Valor a guardar en `perfiles.lugar_residencia`: localidad y, si vino en planilla, provincia. */
function resolverLugarResidenciaDesdePlanilla(
  fila: FilaPlanillaInscripcion,
): string | null {
  const localidad = String(fila.localidadResidencia || "")
    .trim()
    .replace(/\s+/g, " ");
  const provinciaLoc = String(fila.provinciaResidencia || "")
    .trim()
    .replace(/\s+/g, " ");
  let provinciaCanon: string | null = null;
  if (provinciaLoc && !esResidenciaPlaceholder(provinciaLoc)) {
    provinciaCanon = provinciaCanonicaArgentina(provinciaLoc) ?? provinciaLoc;
  }

  if (
    localidad &&
    !esResidenciaPlaceholder(localidad) &&
    provinciaCanon
  ) {
    return `${localidad}, ${provinciaCanon}`;
  }
  if (localidad && !esResidenciaPlaceholder(localidad)) return localidad;

  if (provinciaCanon) {
    return provinciaCanon;
  }

  const asociacion = String(fila.asociacion || "")
    .trim()
    .replace(/\s+/g, " ");
  if (asociacion && !esResidenciaPlaceholder(asociacion)) {
    const canon = provinciaCanonicaArgentina(asociacion);
    return canon ?? asociacion;
  }

  return null;
}

export function advertenciasResidenciaPlanilla(
  fila: FilaPlanillaInscripcion,
): string[] {
  const loc = String(fila.localidadResidencia || "").trim();
  if (!loc || esResidenciaPlaceholder(loc)) return [];
  if (resolverProvinciaDesdePlanilla(fila)) return [];
  return [
    `${etiquetaFilaPlanillaExcel(fila.fila)}: solo consta localidad "${loc}"; no se pudo inferir provincia. Completar en el perfil del jugador.`,
  ];
}
