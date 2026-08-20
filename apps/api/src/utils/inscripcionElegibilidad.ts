import { FAP_ESTADOS_TORNEO, FAP_REGLAS } from "../constants/fap";

export type PerfilElegibilidad = {
  id: string;
  categoria_padel?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: string | null;
  rol?: string | null;
  nombre?: string | null;
};

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

  const ahora = new Date();

  if (torneo.fecha_cierre_inscripcion) {
    const cierre = new Date(torneo.fecha_cierre_inscripcion);
    if (!Number.isNaN(cierre.getTime()) && ahora > cierre) {
      throw new Error(
        "Las inscripciones están cerradas (se alcanzó la fecha límite de inscripción).",
      );
    }
    return;
  }

  if (!torneo.fecha) {
    throw new Error("El torneo no tiene una fecha definida.");
  }

  const fechaTorneo = new Date(torneo.fecha);
  fechaTorneo.setHours(0, 0, 0, 0);
  const fechaActual = new Date();
  fechaActual.setHours(0, 0, 0, 0);

  const diasRestantes = Math.ceil(
    (fechaTorneo.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diasRestantes < FAP_REGLAS.DIAS_CIERRE_INSCRIPCION) {
    throw new Error(
      `Las inscripciones cerraron automáticamente (${FAP_REGLAS.DIAS_CIERRE_INSCRIPCION} días antes del inicio).`,
    );
  }
}

export function assertCategoria(
  perfil: PerfilElegibilidad,
  nivelTorneo: string | null | undefined,
  etiqueta: string,
): void {
  if (!nivelTorneo) return;
  if (perfil.categoria_padel !== nivelTorneo) {
    throw new Error(
      `${etiqueta}: su categoría (${perfil.categoria_padel || "sin definir"}) no coincide con la requerida (${nivelTorneo}).`,
    );
  }
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
