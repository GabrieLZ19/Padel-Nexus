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
  return "general";
}

function indiceColumna(headerRow: string[], patron: RegExp): number {
  return headerRow.findIndex((cell) => patron.test(cell.toUpperCase()));
}

/** Parsea filas crudas (array de arrays) exportadas desde la planilla XLS. */
export function parsearFilasPlanilla(
  matrix: unknown[][],
): ParsePlanillaResult {
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

/** Cuentas creadas desde planilla sin credenciales reales del jugador. */
export function esEmailPlaceholderPlanilla(
  email: string | null | undefined,
): boolean {
  return Boolean(email?.includes("@padelnexus.local"));
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

export { parseNombreCompleto, normalizarDni, resolverProvinciaDesdePlanilla, esResidenciaPlaceholder };

function esResidenciaPlaceholder(valor?: string | null): boolean {
  const v = String(valor || "")
    .trim()
    .toLowerCase();
  return !v || v === "a completar" || v.startsWith("a completar ");
}

/**
 * Provincia para denominación nacional: SOLO columna ASOCIACIÓN de la planilla.
 * No inventar ni usar DIRECCIÓN. Si viene vacía, el caller usa lugar_residencia existente.
 */
function resolverProvinciaDesdePlanilla(
  fila: FilaPlanillaInscripcion,
): string | null {
  const asociacion = String(fila.asociacion || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!asociacion || esResidenciaPlaceholder(asociacion)) return null;
  return asociacion;
}
