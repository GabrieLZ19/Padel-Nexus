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
  const catOk = Boolean(requiredLevel) && userLevel === requiredLevel;
  checks.push({
    code: "categoria",
    label: `Categoría ${requiredLevel || "—"}`,
    passed: catOk,
    message: catOk
      ? undefined
      : `Tu categoría (${userLevel || "sin definir"}) no coincide con la requerida (${requiredLevel || "—"}).`,
    actionHref: !catOk ? "/mi-perfil/ajustes" : undefined,
    actionLabel: !catOk ? "Ir a ajustes" : undefined,
  });

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
