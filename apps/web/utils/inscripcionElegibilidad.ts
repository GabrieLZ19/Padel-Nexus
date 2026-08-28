import { FAP_ESTADOS_LICENCIA, FAP_REGLAS } from "./constants/fap";
import type { Perfil, Torneo } from "./types";

export type CheckElegibilidad = {
  code: "cierre" | "categoria" | "carnet" | "rama" | "edad" | "perfil";
  label: string;
  passed: boolean;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
};

export type ContextoElegibilidadNivel = {
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

function resolverEdadParaElegibilidad(
  contexto: ContextoElegibilidadNivel | undefined,
): { ok: true; edad: number } | { ok: false; motivo: string } {
  if (!contexto?.fechaNacimiento?.trim()) {
    return {
      ok: false,
      motivo:
        "Completá tu fecha de nacimiento en el perfil para validar el rango etario.",
    };
  }

  const fechaRef = resolverFechaReferencia(contexto.fechaReferencia);
  const edad = calcularEdadEnFecha(contexto.fechaNacimiento, fechaRef);
  if (Number.isNaN(edad)) {
    return {
      ok: false,
      motivo: "La fecha de nacimiento del perfil no es válida.",
    };
  }

  return { ok: true, edad };
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

export function hydrateTorneoRestrictions(torneo: Torneo): Torneo {
  const reglas =
    torneo.reglas_arbitraje &&
    typeof torneo.reglas_arbitraje === "object" &&
    !Array.isArray(torneo.reglas_arbitraje)
      ? (torneo.reglas_arbitraje as Record<string, unknown>)
      : {};

  return {
    ...torneo,
    requiere_carnet_federativo: Boolean(
      torneo.requiere_carnet_federativo ?? reglas.requiere_carnet_federativo,
    ),
  };
}

export function torneoExigeCarnet(torneo: Torneo): boolean {
  return Boolean(hydrateTorneoRestrictions(torneo).requiere_carnet_federativo);
}

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
  if (Number.isNaN(nacimiento.getTime())) return NaN;
  const ref = new Date(fechaReferencia);
  let edad = ref.getFullYear() - nacimiento.getFullYear();
  const mes = ref.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && ref.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }
  return edad;
}

export function isInscripcionTemporalmenteAbierta(torneo: Torneo): boolean {
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

export function tieneLicenciaFapActiva(perfil: Perfil | null | undefined): boolean {
  return Boolean(
    perfil?.licencias?.some((l) => l.estado === FAP_ESTADOS_LICENCIA.ACTIVA),
  );
}

export function extraerNumeroCategoriaLibre(
  categoria: string | null | undefined,
): number | null {
  const raw = (categoria || "").trim();
  if (!raw) return null;

  const ordinalMatch = raw.match(/^(\d+)\s*[ªa]/i);
  if (ordinalMatch) return Number(ordinalMatch[1]);

  return null;
}

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

export function torneoValidaCategoria(torneo: Torneo): boolean {
  const reglas =
    torneo.reglas_arbitraje &&
    typeof torneo.reglas_arbitraje === "object" &&
    !Array.isArray(torneo.reglas_arbitraje)
      ? (torneo.reglas_arbitraje as Record<string, unknown>)
      : {};
  if (typeof reglas.validar_categoria === "boolean") {
    return reglas.validar_categoria;
  }
  return true;
}

export type OpcionesElegibilidadNivel = {
  validarCategoria?: boolean;
  validarEdad?: boolean;
};

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

/** Checklist de elegibilidad del jugador 1 (perfil logueado) vs restricciones del torneo. */
export function buildChecksElegibilidadJ1(
  torneo: Torneo,
  perfil: Perfil | null | undefined,
): CheckElegibilidad[] {
  const t = hydrateTorneoRestrictions(torneo);
  const checks: CheckElegibilidad[] = [];

  const abierta = isInscripcionTemporalmenteAbierta(t);
  checks.push({
    code: "cierre",
    label: "Inscripción abierta",
    passed: abierta,
    message: abierta
      ? t.fecha_cierre_inscripcion
        ? `Cierra el ${formatFechaCorta(t.fecha_cierre_inscripcion)}`
        : `Abierta hasta ${FAP_REGLAS.DIAS_CIERRE_INSCRIPCION} días antes del torneo`
      : t.fecha_cierre_inscripcion
        ? "Se alcanzó la fecha límite de inscripción"
        : `Cerró automáticamente (${FAP_REGLAS.DIAS_CIERRE_INSCRIPCION} días antes del inicio)`,
  });

  const requiredLevel = t.nivel || "";
  const userLevel = perfil?.categoria_padel || "";
  const validarCategoria = torneoValidaCategoria(t);
  const validarEdad = Boolean(t.validar_edad);
  const clasificacionNivel = clasificarNivelEspecial(requiredLevel);

  if (validarCategoria || validarEdad) {
    const categoriaEval = puedeJugarEnNivelTorneo(
      userLevel,
      requiredLevel,
      {
        fechaNacimiento: perfil?.fecha_nacimiento,
        fechaReferencia: t.fecha,
      },
      { validarCategoria, validarEdad },
    );
    const catOk = !requiredLevel || categoriaEval.permitido;

    const etiquetaCategoria =
      clasificacionNivel && clasificacionNivel !== "libre_numerico"
        ? clasificacionNivel.tipo === "sub"
          ? `Categoría ${requiredLevel} (rango etario)`
          : clasificacionNivel.tipo === "senior" ||
              clasificacionNivel.tipo === "junior_mayor"
            ? `Categoría ${requiredLevel} (edad mínima)`
            : `Categoría ${requiredLevel}`
        : requiredLevel
          ? `Categoría ${requiredLevel} o más exigente`
          : "Categoría";

    checks.push({
      code: "categoria",
      label: etiquetaCategoria,
      passed: catOk,
      message: catOk
        ? userLevel && requiredLevel && userLevel !== requiredLevel
          ? clasificacionNivel && clasificacionNivel !== "libre_numerico"
            ? `Podés jugar: cumplís el requisito etario para ${requiredLevel}.`
            : `Podés jugar: tu categoría (${userLevel}) alcanza para este torneo (${requiredLevel}).`
          : undefined
        : categoriaEval.motivo
          ? categoriaEval.motivo
          : categoriaEval.requiereCoincidenciaExacta
            ? `Tu categoría (${userLevel || "sin definir"}) no coincide con la requerida (${requiredLevel || "—"}).`
            : `Siendo categoría ${userLevel || "sin definir"}, no podés inscribirte a un torneo de ${requiredLevel}. Solo podés jugar en tu categoría o en torneos más exigentes.`,
      actionHref: !catOk ? "/mi-perfil/ajustes" : undefined,
      actionLabel: !catOk ? "Ir a ajustes" : undefined,
    });
  } else {
    checks.push({
      code: "categoria",
      label: "Categoría",
      passed: true,
      message: "No requerida para este torneo",
    });
  }

  const exigeCarnet = torneoExigeCarnet(t);
  if (exigeCarnet) {
    const carnetOk = tieneLicenciaFapActiva(perfil);
    checks.push({
      code: "carnet",
      label: "Carnet FAP activo",
      passed: carnetOk,
      message: carnetOk
        ? undefined
        : "Este torneo exige licencia FAP vigente y activa.",
      actionHref: !carnetOk ? "/mi-perfil" : undefined,
      actionLabel: !carnetOk ? "Solicitar carnet" : undefined,
    });
  } else {
    checks.push({
      code: "carnet",
      label: "Carnet FAP",
      passed: true,
      message: "No requerido para este torneo",
    });
  }

  const rama = t.rama || "";
  if (rama && rama !== "Mixta") {
    const sexo = (perfil?.sexo || "").toLowerCase();
    let ramaOk = false;
    let ramaMsg: string | undefined;
    if (!sexo) {
      ramaMsg = `Completá el sexo en tu perfil (rama ${rama}).`;
    } else if (rama.toLowerCase() === "masculina" && sexo !== "masculino") {
      ramaMsg = "No podés inscribirte a un torneo de rama Masculina.";
    } else if (rama.toLowerCase() === "femenina" && sexo !== "femenino") {
      ramaMsg = "No podés inscribirte a un torneo de rama Femenina.";
    } else {
      ramaOk = true;
    }
    checks.push({
      code: "rama",
      label: `Rama ${rama}`,
      passed: ramaOk,
      message: ramaMsg,
      actionHref: !ramaOk && !sexo ? "/mi-perfil/ajustes" : undefined,
      actionLabel: !ramaOk && !sexo ? "Completar perfil" : undefined,
    });
  }

  if (validarEdad && !nivelValidaEdadPorNivel(t.nivel)) {
    const { requiere, edadMinima } = resolverRequisitoEdad(
      t.categoria,
      t.validar_edad,
    );
    if (requiere) {
      const tieneFecha = Boolean(perfil?.fecha_nacimiento);
      let edadOk = tieneFecha;
      let edadMsg: string | undefined;

      if (!tieneFecha) {
        edadMsg =
          "Completá tu fecha de nacimiento en el perfil para esta categoría.";
      } else if (edadMinima != null && t.fecha && perfil?.fecha_nacimiento) {
        const edad = calcularEdadEnFecha(
          perfil.fecha_nacimiento,
          new Date(t.fecha),
        );
        if (Number.isNaN(edad) || edad < edadMinima) {
          edadOk = false;
          edadMsg = `Se requieren al menos ${edadMinima} años al día del torneo.`;
        }
      }

      checks.push({
        code: "edad",
        label:
          edadMinima != null
            ? `Edad mínima +${edadMinima}`
            : "Fecha de nacimiento",
        passed: edadOk,
        message: edadMsg,
        actionHref: !edadOk ? "/mi-perfil/ajustes" : undefined,
        actionLabel: !edadOk ? "Completar perfil" : undefined,
      });
    }
  }

  return checks;
}

export function allChecksPassed(checks: CheckElegibilidad[]): boolean {
  return checks.every((c) => c.passed);
}

function formatFechaCorta(iso: string): string {
  const parts = iso.split("T")[0]?.split("-");
  if (!parts || parts.length < 3) return iso;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}
