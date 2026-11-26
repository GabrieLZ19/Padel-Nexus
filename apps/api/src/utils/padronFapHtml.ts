export type FilaPadronFap = {
  fila: number;
  nombre: string;
  apellido: string;
  nivel: string;
  dni: string;
  fechaNacimiento: string;
  licenciaRaw: string;
  provincia: string;
  ciudad: string;
  instPrimaria: string;
  representacion: string;
};

export type PerfilExistentePadron = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono?: string | null;
  categoria_padel: string | null;
  lugar_residencia: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  pendiente_activacion?: boolean | null;
};

export type DatosLimpiosPadronFap = {
  nombre: string;
  apellido: string;
  categoria_padel: string;
  sexo: "masculino" | "femenino";
  fecha_nacimiento: string;
  lugar_residencia: string;
};

export type OpcionesPatchPadronFap = {
  sanearAcentos?: boolean;
  esEmailPlaceholder?: (email: string | null | undefined) => boolean;
};

const ENTIDADES_HTML: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  uuml: "ü",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  Ntilde: "Ñ",
  Uuml: "Ü",
};

function decodificarEntidadesHtml(texto: string): string {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-zA-Z]+);/g, (full, nombre: string) => {
      return ENTIDADES_HTML[nombre] ?? full;
    });
}

function esCharsetLatin1(charset: string): boolean {
  const norm = charset.trim().toLowerCase();
  return (
    norm === "iso-8859-1" ||
    norm === "iso8859-1" ||
    norm === "iso_8859-1" ||
    norm === "latin1" ||
    norm === "latin-1" ||
    norm === "windows-1252" ||
    norm === "cp1252"
  );
}

/**
 * Decodifica el HTML exportado del padrón FAP detectando de forma segura
 * UTF-8 vs Latin-1 / ISO-8859-1 / Windows-1252 para no corromper tildes ni ñ.
 */
export function decodificarHtmlPadronFap(raw: Buffer | Uint8Array): string {
  const bytes =
    raw instanceof Uint8Array ? raw : new Uint8Array(raw);

  // BOM UTF-8 explícito
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  const cabecera = Buffer.from(
    bytes.buffer,
    bytes.byteOffset,
    Math.min(bytes.byteLength, 2048),
  ).toString("latin1");
  const metaCharset = cabecera.match(
    /<meta\b[^>]*charset\s*=\s*["']?\s*([a-z0-9._-]+)/i,
  )?.[1];

  if (metaCharset && esCharsetLatin1(metaCharset)) {
    return new TextDecoder("windows-1252").decode(bytes);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function contieneCaracterReemplazo(
  valor: string | null | undefined,
): boolean {
  return typeof valor === "string" && valor.includes("\uFFFD");
}

function normalizarSinDiacriticos(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function debeSanearCampoTexto(
  actual: string | null | undefined,
  limpio: string,
  fichaProvisoria: boolean,
  editadaManualmente: boolean,
): boolean {
  if (!fichaProvisoria) return false;
  const limpioTrim = limpio.trim();
  if (!limpioTrim || contieneCaracterReemplazo(limpioTrim)) return false;

  const actualTrim = (actual ?? "").trim();
  if (!actualTrim) return true;
  if (actualTrim === limpioTrim) return false;

  // Corrupción inequívoca por lectura UTF-8 de bytes Latin-1 (U+FFFD)
  if (contieneCaracterReemplazo(actualTrim)) return true;

  // Si la ficha tuvo ediciones manuales, no sobreescribir campos sin U+FFFD
  if (editadaManualmente) return false;

  // Sin ediciones manuales: solo restaurar tildes/diacríticos sin alterar el texto base
  return (
    normalizarSinDiacriticos(actualTrim) ===
    normalizarSinDiacriticos(limpioTrim)
  );
}

/**
 * Construye el patch de actualización de un perfil existente a partir del padrón FAP.
 * En modo `sanearAcentos`, corrige `nombre`, `apellido` y `lugar_residencia` únicamente
 * en fichas con `pendiente_activacion = true` sin ediciones manuales previas (o que
 * contengan el carácter de reemplazo U+FFFD), preservando siempre fichas activadas/editadas.
 */
export function construirPatchPerfilPadronFap(
  existente: PerfilExistentePadron,
  datos: DatosLimpiosPadronFap,
  opciones: OpcionesPatchPadronFap = {},
): Record<string, unknown> {
  const sanear = Boolean(opciones.sanearAcentos);
  const esPlaceholder = opciones.esEmailPlaceholder ?? (() => false);
  const fichaProvisoria = existente.pendiente_activacion === true;
  const editadaManualmente =
    !esPlaceholder(existente.email) ||
    Boolean(existente.telefono && existente.telefono.trim());

  const patch: Record<string, unknown> = {};

  if (
    (!existente.nombre && datos.nombre) ||
    (sanear &&
      debeSanearCampoTexto(
        existente.nombre,
        datos.nombre,
        fichaProvisoria,
        editadaManualmente,
      ))
  ) {
    patch.nombre = datos.nombre;
  }

  if (
    (!existente.apellido && datos.apellido) ||
    (sanear &&
      debeSanearCampoTexto(
        existente.apellido,
        datos.apellido,
        fichaProvisoria,
        editadaManualmente,
      ))
  ) {
    patch.apellido = datos.apellido;
  }

  if (!existente.categoria_padel) patch.categoria_padel = datos.categoria_padel;
  if (!existente.sexo) patch.sexo = datos.sexo;
  if (!existente.fecha_nacimiento && datos.fecha_nacimiento) {
    patch.fecha_nacimiento = datos.fecha_nacimiento;
  }

  if (
    !existente.lugar_residencia ||
    existente.lugar_residencia === "A completar" ||
    (sanear &&
      debeSanearCampoTexto(
        existente.lugar_residencia,
        datos.lugar_residencia,
        fichaProvisoria,
        editadaManualmente,
      ))
  ) {
    if (
      datos.lugar_residencia &&
      datos.lugar_residencia !== existente.lugar_residencia
    ) {
      patch.lugar_residencia = datos.lugar_residencia;
    }
  }

  if (
    existente.email &&
    esPlaceholder(existente.email) &&
    Object.keys(patch).length > 0
  ) {
    patch.pendiente_activacion = true;
  }

  return patch;
}

function parseCell(html: string): string {
  return decodificarEntidadesHtml(html.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function extraerFilasHtml(html: string): FilaPadronFap[] {
  const rowRe = /<tr>\s*<td align=center>(\d+)<\/td>[\s\S]*?<\/tr>/g;
  const filas: FilaPadronFap[] = [];
  let match: RegExpExecArray | null;

  while ((match = rowRe.exec(html)) !== null) {
    const chunk = match[0];
    const tds = [...chunk.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) =>
      parseCell(x[1]),
    );
    if (tds.length < 11) continue;

    const fechaRaw = tds[5];
    const fechaNacimiento =
      /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw) && !fechaRaw.startsWith("0000")
        ? fechaRaw
        : "";

    filas.push({
      fila: Number(match[1]),
      nombre: tds[1],
      apellido: tds[2],
      nivel: tds[3],
      dni: tds[4].replace(/\D/g, ""),
      fechaNacimiento,
      licenciaRaw: tds[6],
      provincia: tds[9],
      ciudad: tds[10],
      instPrimaria: tds[11] ?? "",
      representacion: tds[12] ?? "",
    });
  }

  return filas;
}

/** Última fila gana ante DNI duplicados en el export. */
export function parsePadronFapHtml(
  htmlOrBuffer: string | Buffer | Uint8Array,
): FilaPadronFap[] {
  const html =
    typeof htmlOrBuffer === "string"
      ? htmlOrBuffer
      : decodificarHtmlPadronFap(htmlOrBuffer);
  const raw = extraerFilasHtml(html);
  const porDni = new Map<string, FilaPadronFap>();

  for (const fila of raw) {
    if (!fila.dni || fila.dni.length < 7) continue;
    porDni.set(fila.dni, fila);
  }

  return [...porDni.values()].sort((a, b) => a.fila - b.fila);
}