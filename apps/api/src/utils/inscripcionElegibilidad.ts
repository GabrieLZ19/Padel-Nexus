import { FAP_ESTADOS_TORNEO, FAP_REGLAS } from "../constants/fap";

export type PerfilElegibilidad = {
  id: string;
  categoria_padel?: string | null;
  fecha_nacimiento?: string | null;
  dni?: string | null;
  sexo?: string | null;
  rol?: string | null;
  nombre?: string | null;
};

export type ContextoElegibilidadNivel = {
  /** Fecha de nacimiento del perfil (p. ej. cargada por planilla al identificar al jugador por DNI). */
  fechaNacimiento?: string | null;
  fechaReferencia?: string | Date | null;
};

export type ResultadoElegibilidadNivel = {
  permitido: boolean;
  requiereCoincidenciaExacta: boolean;
  motivo?: string;
};

type ClasificacionNivelEspecial =
  | { tipo: "sub"; edadMaximaExclusiva: number }
  | { tipo: "senior"; edadMinima: number }
  | { tipo: "junior_mayor"; edadMinima: number }
  | { tipo: "ladies" }
  | { tipo: "inicial" };

export type TorneoElegibilidad = {
  id: string;
  fecha?: string | null;
  fecha_cierre_inscripcion?: string | null;
  nivel?: string | null;
  alcance?: string | null;
  categoria?: string | null;
  rama?: string | null;
  validar_edad?: boolean | null;
  cupos_maximos?: number | null;
  cupos_actuales?: number | null;
  estado?: string | null;
  reglas_arbitraje?: unknown;
  club_id?: string | null;
  asociacion_id?: string | null;
};

/** Torneo del circuito nacional FAP (alcance o nivel legacy). */
export function esTorneoNacional(torneo: {
  alcance?: string | null;
  nivel?: string | null;
}): boolean {
  if (/nacional/i.test(String(torneo.alcance || "").trim())) return true;
  return String(torneo.nivel || "").toLowerCase() === "nacional";
}

export function parseReglasArbitraje(
  raw: unknown,
): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function torneoExigeCarnet(torneo: TorneoElegibilidad): boolean {
  return Boolean(
    parseReglasArbitraje(torneo.reglas_arbitraje).requiere_carnet_federativo,
  );
}

export function torneoExigeAfiliacionOrganizadora(
  torneo: TorneoElegibilidad,
): boolean {
  return Boolean(
    parseReglasArbitraje(torneo.reglas_arbitraje)
      .requiere_afiliacion_organizadora,
  );
}

export type CheckResult = {
  code: string;
  label: string;
  passed: boolean;
  message?: string;
};

/**
 * Extrae el número de categorías libres oficiales (1ª–8ª).
 * Retorna null para categorías especiales (Sub-, Ladies, Seniors, etc.).
 */
export function extraerNumeroCategoriaLibre(
  categoria: string | null | undefined,
): number | null {
  const raw = (categoria || "").trim();
  if (!raw) return null;

  const ordinalMatch = raw.match(/^(\d+)\s*[ªa]/i);
  if (ordinalMatch) return Number(ordinalMatch[1]);

  return null;
}

/** Clasifica niveles especiales (Sub-, Seniors, Ladies, etc.) para validar edad. */
export function clasificarNivelEspecial(
  nivel: string | null | undefined,
): ClasificacionNivelEspecial | "libre_numerico" | null {
  const raw = (nivel || "").trim();
  if (!raw) return null;

  if (extraerNumeroCategoriaLibre(raw) != null) return "libre_numerico";

  const subMatch = raw.match(/^Sub-(\d+)(?:\s+Promocional)?$/i);
  if (subMatch) {
    return { tipo: "sub", edadMaximaExclusiva: Number(subMatch[1]) };
  }

  const seniorMatch = raw.match(/^(Seniors|Women)\s*\+(\d+)$/i);
  if (seniorMatch) {
    return { tipo: "senior", edadMinima: Number(seniorMatch[2]) };
  }

  if (/^Juniors\s*\+18$/i.test(raw)) {
    return { tipo: "junior_mayor", edadMinima: 18 };
  }

  if (/^Ladies(\s+[ABC])?$/i.test(raw)) {
    return { tipo: "ladies" };
  }

  if (/^Inicial$/i.test(raw)) {
    return { tipo: "inicial" };
  }

  return null;
}

export function torneoValidaCategoria(torneo: {
  reglas_arbitraje?: unknown;
}): boolean {
  const reglas = parseReglasArbitraje(torneo.reglas_arbitraje);
  if (typeof reglas.validar_categoria === "boolean") {
    return reglas.validar_categoria;
  }
  return true;
}

export function nivelValidaEdadPorNivel(
  nivel: string | null | undefined,
): boolean {
  const clasificacion = clasificarNivelEspecial(nivel);
  if (!clasificacion || clasificacion === "libre_numerico") return false;
  return (
    clasificacion.tipo === "sub" ||
    clasificacion.tipo === "senior" ||
    clasificacion.tipo === "junior_mayor"
  );
}

export type OpcionesElegibilidadNivel = {
  validarCategoria?: boolean;
  validarEdad?: boolean;
};

function resolverEdadParaElegibilidad(
  contexto: ContextoElegibilidadNivel | undefined,
  etiquetaPrefijo?: string,
): { ok: true; edad: number } | { ok: false; motivo: string } {
  const prefijo = etiquetaPrefijo ? `${etiquetaPrefijo}: ` : "";

  if (!contexto?.fechaNacimiento?.trim()) {
    return {
      ok: false,
      motivo: `${prefijo}completá la fecha de nacimiento en el perfil para validar el rango etario.`,
    };
  }

  const fechaRef = resolverFechaReferencia(contexto.fechaReferencia);
  try {
    const edad = calcularEdadEnFecha(contexto.fechaNacimiento, fechaRef);
    return { ok: true, edad };
  } catch {
    return {
      ok: false,
      motivo: `${prefijo}la fecha de nacimiento del perfil no es válida.`,
    };
  }
}

function resolverFechaReferencia(
  fechaReferencia?: string | Date | null,
): Date {
  if (fechaReferencia instanceof Date) return fechaReferencia;
  if (typeof fechaReferencia === "string" && fechaReferencia.trim()) {
    const parsed = new Date(fechaReferencia);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function evaluarCoincidenciaCategoria(
  categoriaJugador: string | null | undefined,
  nivelTorneo: string,
): ResultadoElegibilidadNivel {
  const coincide =
    (categoriaJugador || "").trim() === nivelTorneo.trim();
  if (!coincide) {
    return {
      permitido: false,
      requiereCoincidenciaExacta: true,
      motivo: `Tu categoría (${categoriaJugador || "sin definir"}) no coincide con la requerida (${nivelTorneo}).`,
    };
  }
  return { permitido: true, requiereCoincidenciaExacta: true };
}

function evaluarElegibilidadNivelEspecial(
  clasificacion: ClasificacionNivelEspecial,
  categoriaJugador: string | null | undefined,
  nivelTorneo: string,
  contexto?: ContextoElegibilidadNivel,
  opciones?: OpcionesElegibilidadNivel,
): ResultadoElegibilidadNivel {
  const validarCategoria = opciones?.validarCategoria !== false;
  const validarEdad = opciones?.validarEdad !== false;

  if (
    clasificacion.tipo === "sub" ||
    clasificacion.tipo === "senior" ||
    clasificacion.tipo === "junior_mayor"
  ) {
    if (!validarCategoria && !validarEdad) {
      return { permitido: true, requiereCoincidenciaExacta: false };
    }

    let edadOk = true;
    let edadMotivo: string | undefined;

    if (validarEdad) {
      const edadRes = resolverEdadParaElegibilidad(contexto);
      if (!edadRes.ok) {
        return {
          permitido: false,
          requiereCoincidenciaExacta: false,
          motivo: edadRes.motivo,
        };
      }

      const edad = edadRes.edad;

      if (clasificacion.tipo === "sub") {
        const max = clasificacion.edadMaximaExclusiva;
        if (edad >= max) {
          edadOk = false;
          edadMotivo = `Se requiere tener menos de ${max} años al día del torneo (edad calculada: ${edad}).`;
        }
      } else {
        const min = clasificacion.edadMinima;
        if (edad < min) {
          edadOk = false;
          edadMotivo = `Se requiere al menos ${min} años al día del torneo (edad calculada: ${edad}).`;
        }
      }
    }

    if (!edadOk) {
      return {
        permitido: false,
        requiereCoincidenciaExacta: false,
        motivo: edadMotivo,
      };
    }

    if (validarCategoria) {
      return evaluarCoincidenciaCategoria(categoriaJugador, nivelTorneo);
    }

    return { permitido: true, requiereCoincidenciaExacta: false };
  }

  if (clasificacion.tipo === "ladies" || clasificacion.tipo === "inicial") {
    if (!validarCategoria) {
      return { permitido: true, requiereCoincidenciaExacta: false };
    }
    return evaluarCoincidenciaCategoria(categoriaJugador, nivelTorneo);
  }

  return { permitido: true, requiereCoincidenciaExacta: false };
}

/**
 * Regla FAP/APA libres: un jugador puede jugar en su categoría o en torneos
 * más exigentes (número menor), nunca en categorías inferiores (número mayor).
 * Ej.: 5ª → puede 1ª–5ª; no puede 6ª, 7ª, etc.
 *
 * Categorías especiales: calcula la edad desde la fecha de nacimiento del perfil
 * (identificado por DNI en planilla/registro) y la compara con el rango del nivel.
 * Sub-N exige edad < N; Seniors/Women +N exige edad >= N.
 */
export function puedeJugarEnNivelTorneo(
  categoriaJugador: string | null | undefined,
  nivelTorneo: string | null | undefined,
  contexto?: ContextoElegibilidadNivel,
  opciones?: OpcionesElegibilidadNivel,
): ResultadoElegibilidadNivel {
  const validarCategoria = opciones?.validarCategoria !== false;
  const validarEdad = opciones?.validarEdad !== false;

  if (!nivelTorneo) return { permitido: true, requiereCoincidenciaExacta: false };
  if (!validarCategoria && !validarEdad) {
    return { permitido: true, requiereCoincidenciaExacta: false };
  }

  const clasificacion = clasificarNivelEspecial(nivelTorneo);
  if (clasificacion && clasificacion !== "libre_numerico") {
    return evaluarElegibilidadNivelEspecial(
      clasificacion,
      categoriaJugador,
      nivelTorneo,
      contexto,
      opciones,
    );
  }

  if (!validarCategoria) {
    return { permitido: true, requiereCoincidenciaExacta: false };
  }

  const numJugador = extraerNumeroCategoriaLibre(categoriaJugador);
  const numTorneo = extraerNumeroCategoriaLibre(nivelTorneo);

  if (numJugador == null || numTorneo == null) {
    return {
      permitido:
        (categoriaJugador || "").trim() === (nivelTorneo || "").trim(),
      requiereCoincidenciaExacta: true,
    };
  }

  return {
    permitido: numTorneo <= numJugador,
    requiereCoincidenciaExacta: false,
  };
}

/** Ejecuta un assert síncrono y lo convierte en check no-throw. */
export function runSyncCheck(
  code: string,
  label: string,
  fn: () => void,
): CheckResult {
  try {
    fn();
    return { code, label, passed: true };
  } catch (error: unknown) {
    return {
      code,
      label,
      passed: false,
      message: error instanceof Error ? error.message : "Validación fallida",
    };
  }
}

/** Edad mínima parseada de la categoría (+30, +40, …). Sin umbral numérico → solo exige fecha de nacimiento. */
export function resolverRequisitoEdad(
  categoria: string | null | undefined,
  validarEdad: boolean | null | undefined,
): { requiere: boolean; edadMinima: number | null } {
  const cat = categoria || "";
  const match = cat.match(/\+(\d{2})/);
  if (match) {
    return { requiere: true, edadMinima: Number(match[1]) };
  }
  const porNombre = /veteranos|ladies/i.test(cat);
  if (validarEdad || porNombre) {
    return { requiere: true, edadMinima: null };
  }
  return { requiere: false, edadMinima: null };
}

export function calcularEdadEnFecha(
  fechaNacimiento: string,
  fechaReferencia: Date,
): number {
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) {
    throw new Error("Fecha de nacimiento inválida.");
  }
  const ref = new Date(fechaReferencia);
  let edad = ref.getFullYear() - nacimiento.getFullYear();
  const mes = ref.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && ref.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }
  return edad;
}

export function inscripcionAbiertaPorFechas(
  torneo: Pick<TorneoElegibilidad, "fecha" | "fecha_cierre_inscripcion">,
): boolean {
  const ahora = new Date();

  if (torneo.fecha_cierre_inscripcion) {
    const cierre = new Date(torneo.fecha_cierre_inscripcion);
    if (!Number.isNaN(cierre.getTime()) && ahora > cierre) return false;
    return true;
  }

  if (!torneo.fecha) return false;

  const fechaTorneo = new Date(torneo.fecha);
  fechaTorneo.setHours(0, 0, 0, 0);
  const fechaActual = new Date();
  fechaActual.setHours(0, 0, 0, 0);

  const diasRestantes = Math.ceil(
    (fechaTorneo.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24),
  );

  return diasRestantes >= FAP_REGLAS.DIAS_CIERRE_INSCRIPCION;
}

export function assertInscripcionAbierta(torneo: TorneoElegibilidad): void {
  const estado = (torneo.estado || "").trim();
  const estadoLower = estado.toLowerCase();

  const cerrados = [
    FAP_ESTADOS_TORNEO.CERRADO.toLowerCase(),
    FAP_ESTADOS_TORNEO.EN_CURSO.toLowerCase(),
    FAP_ESTADOS_TORNEO.FINALIZADO.toLowerCase(),
  ];

  if (cerrados.includes(estadoLower)) {
    throw new Error("Las inscripciones no están abiertas para este torneo.");
  }

  if (!inscripcionAbiertaPorFechas(torneo)) {
    if (torneo.fecha_cierre_inscripcion) {
      throw new Error(
        "Las inscripciones están cerradas (se alcanzó la fecha límite de inscripción).",
      );
    }
    throw new Error(
      `Las inscripciones cerraron automáticamente (${FAP_REGLAS.DIAS_CIERRE_INSCRIPCION} días antes del inicio).`,
    );
  }
}

export function assertCategoria(
  perfil: PerfilElegibilidad,
  torneo: Pick<
    TorneoElegibilidad,
    "nivel" | "fecha" | "validar_edad" | "reglas_arbitraje"
  >,
  etiqueta: string,
): void {
  const validarCategoria = torneoValidaCategoria(torneo);
  const validarEdad = Boolean(torneo.validar_edad);
  if (!validarCategoria && !validarEdad) return;
  if (!torneo.nivel) return;

  const { permitido, requiereCoincidenciaExacta, motivo } =
    puedeJugarEnNivelTorneo(
      perfil.categoria_padel,
      torneo.nivel,
      {
        fechaNacimiento: perfil.fecha_nacimiento,
        fechaReferencia: torneo.fecha,
      },
      { validarCategoria, validarEdad },
    );

  if (permitido) return;

  if (motivo) {
    throw new Error(`${etiqueta}: ${motivo}`);
  }

  if (requiereCoincidenciaExacta) {
    throw new Error(
      `${etiqueta}: su categoría (${perfil.categoria_padel || "sin definir"}) no coincide con la requerida (${torneo.nivel}).`,
    );
  }

  throw new Error(
    `${etiqueta}: siendo categoría ${perfil.categoria_padel || "sin definir"}, no podés inscribirte a un torneo de ${torneo.nivel}. Solo podés jugar en tu categoría o en torneos más exigentes.`,
  );
}

export function assertRama(
  perfil: PerfilElegibilidad,
  rama: string | null | undefined,
  etiqueta: string,
): void {
  if (!rama || rama === "Mixta") return;

  const sexo = (perfil.sexo || "").toLowerCase().trim();
  if (!sexo) {
    throw new Error(
      `${etiqueta}: completá el sexo en el perfil antes de inscribirte a un torneo de rama ${rama}.`,
    );
  }

  const ramaLower = rama.toLowerCase();
  if (ramaLower === "masculina" && sexo !== "masculino") {
    throw new Error(
      `${etiqueta}: no podés inscribirte a un torneo de rama Masculina.`,
    );
  }
  if (ramaLower === "femenina" && sexo !== "femenino") {
    throw new Error(
      `${etiqueta}: no podés inscribirte a un torneo de rama Femenina.`,
    );
  }
}

export function assertEdad(
  perfil: PerfilElegibilidad,
  torneo: TorneoElegibilidad,
  etiqueta: string,
): void {
  if (!torneo.validar_edad) return;
  if (nivelValidaEdadPorNivel(torneo.nivel)) return;

  const { requiere, edadMinima } = resolverRequisitoEdad(
    torneo.categoria,
    torneo.validar_edad,
  );
  if (!requiere) return;

  if (!perfil.fecha_nacimiento) {
    throw new Error(
      `${etiqueta}: completá la fecha de nacimiento en el perfil antes de inscribirte a esta categoría restringida por edad.`,
    );
  }

  if (edadMinima == null) return;

  if (!torneo.fecha) {
    throw new Error("El torneo no tiene una fecha definida para validar edad.");
  }

  const edad = calcularEdadEnFecha(
    perfil.fecha_nacimiento,
    new Date(torneo.fecha),
  );
  if (edad < edadMinima) {
    throw new Error(
      `${etiqueta}: se requiere al menos ${edadMinima} años al día del torneo (edad actual calculada: ${edad}).`,
    );
  }
}
