import type { RolUsuario } from "../types/user.types";
import { esRolFederacionNacional } from "../auth/roles";

// ============================================================================
// RAMAS (División por sexo)
// ============================================================================
export const RAMAS_PADEL = [
  { value: "Masculina", label: "Masculina" },
  { value: "Femenina", label: "Femenina" },
  { value: "Mixta", label: "Mixta" },
] as const;

export type RamaPadel = (typeof RAMAS_PADEL)[number]["value"];

export type ReglamentoTorneo = "FAP" | "APA" | "Amateur";

export const REGLAMENTOS_TORNEO: {
  value: ReglamentoTorneo;
  label: string;
}[] = [
  { value: "FAP", label: "FAP (Federación Argentina de Pádel)" },
  { value: "APA", label: "APA (Asociación de Pádel Argentina)" },
  { value: "Amateur", label: "Amateur / Independiente" },
];

/** Reglamento persistido en torneos (columna `reglamento`, fallback legacy `asociacion`). */
export function reglamentoTorneo(torneo: {
  reglamento?: string | null;
  asociacion?: string | null;
}): ReglamentoTorneo {
  const raw = String(torneo.reglamento || torneo.asociacion || "FAP").trim();
  if (raw === "APA" || raw === "Amateur") return raw;
  return "FAP";
}

export function labelReglamentoTorneo(
  reglamento: ReglamentoTorneo | string,
): string {
  return (
    REGLAMENTOS_TORNEO.find((r) => r.value === reglamento)?.value ||
    String(reglamento || "FAP")
  );
}

// ============================================================================
// CUPOS OFICIALES FAP / APA (Sin BYEs impares)
// ============================================================================
export const CUPOS_ESTANDAR_FAP = [
  { value: "6", label: "6 Parejas / Jugadores (2 Zonas de 3)" },
  {
    value: "8",
    label: "8 Parejas / Jugadores (2 Zonas de 4 / Elim. Directa 8)",
  },
  { value: "12", label: "12 Parejas / Jugadores (4 Zonas de 3)" },
  {
    value: "16",
    label: "16 Parejas / Jugadores (4 Zonas de 4 / Elim. Directa 16)",
  },
  { value: "24", label: "24 Parejas / Jugadores (8 Zonas de 3)" },
  {
    value: "32",
    label: "32 Parejas / Jugadores (8 Zonas de 4 / Elim. Directa 32)",
  },
  { value: "64", label: "64 Parejas / Jugadores (Eliminatoria Directa 64)" },
] as const;

// ============================================================================
// CATEGORÍAS POR ASOCIACIÓN
// ============================================================================
export const CATEGORIAS_POR_ASOCIACION: Record<
  string,
  { value: string; label: string }[]
> = {
  FAP: [
    { value: "Libres", label: "Libres" },
    { value: "Ladies & Veteranos", label: "Ladies & Veteranos" },
    { value: "Menores", label: "Menores" },
  ],
  APA: [
    { value: "Libres", label: "Libres" },
    { value: "Ladies & Veteranos", label: "Ladies & Veteranos" },
    { value: "Menores", label: "Menores" },
  ],
  Amateur: [
    { value: "Libres", label: "Libres" },
    { value: "Ladies & Veteranos", label: "Ladies & Veteranos" },
    { value: "Menores", label: "Menores" },
  ],
};

// ============================================================================
// NIVELES POR ASOCIACIÓN + CATEGORÍA
// Fuente: https://fapargentina.com.ar/torneos y reglamento APA
// ============================================================================
export const NIVELES_POR_ASOCIACION_CATEGORIA: Record<
  string,
  Record<string, { value: string; label: string }[]>
> = {
  FAP: {
    Libres: [
      { value: "1ª", label: "1ª (Profesional)" },
      { value: "2ª", label: "2ª" },
      { value: "3ª", label: "3ª" },
      { value: "4ª", label: "4ª" },
      { value: "5ª", label: "5ª" },
      { value: "6ª", label: "6ª" },
      { value: "7ª", label: "7ª" },
      { value: "8ª", label: "8ª" },
    ],
    "Ladies & Veteranos": [
      { value: "Juniors +18", label: "Juniors +18" },
      { value: "Seniors +30", label: "Seniors +30" },
      { value: "Seniors +35", label: "Seniors +35" },
      { value: "Seniors +40", label: "Seniors +40" },
      { value: "Seniors +45", label: "Seniors +45" },
      { value: "Seniors +50", label: "Seniors +50" },
      { value: "Seniors +55", label: "Seniors +55" },
      { value: "Seniors +60", label: "Seniors +60" },
      { value: "Ladies A", label: "Ladies A" },
      { value: "Ladies B", label: "Ladies B" },
      { value: "Ladies C", label: "Ladies C" },
      { value: "Women +35", label: "Women +35" },
      { value: "Women +45", label: "Women +45" },
      { value: "Women +55", label: "Women +55" },
    ],
    Menores: [
      { value: "Sub-10", label: "Sub-10" },
      { value: "Sub-12", label: "Sub-12" },
      { value: "Sub-14", label: "Sub-14" },
      { value: "Sub-16", label: "Sub-16" },
      { value: "Sub-18", label: "Sub-18" },
      { value: "Sub-12 Promocional", label: "Sub-12 Promocional" },
      { value: "Sub-14 Promocional", label: "Sub-14 Promocional" },
      { value: "Sub-16 Promocional", label: "Sub-16 Promocional" },
    ],
  },
  APA: {
    Libres: [
      { value: "1ª", label: "1ª (Profesional)" },
      { value: "2ª", label: "2ª" },
      { value: "3ª", label: "3ª" },
      { value: "4ª", label: "4ª" },
      { value: "5ª", label: "5ª" },
      { value: "6ª", label: "6ª" },
      { value: "7ª", label: "7ª" },
      { value: "8ª", label: "8ª" },
    ],
    "Ladies & Veteranos": [
      { value: "Senior A", label: "Senior A" },
      { value: "Senior B", label: "Senior B" },
      { value: "Senior C", label: "Senior C" },
      { value: "Senior +35", label: "Senior +35" },
      { value: "Senior +45", label: "Senior +45" },
      { value: "Senior +55", label: "Senior +55" },
      { value: "Ladies A", label: "Ladies A" },
      { value: "Ladies B", label: "Ladies B" },
      { value: "Ladies C", label: "Ladies C" },
    ],
    Menores: [
      { value: "Sub-10", label: "Sub-10" },
      { value: "Sub-12", label: "Sub-12" },
      { value: "Sub-14", label: "Sub-14" },
      { value: "Sub-16", label: "Sub-16" },
      { value: "Sub-18", label: "Sub-18" },
    ],
  },
  Amateur: {
    Libres: [
      { value: "1ª", label: "1ª" },
      { value: "2ª", label: "2ª" },
      { value: "3ª", label: "3ª" },
      { value: "4ª", label: "4ª" },
      { value: "5ª", label: "5ª" },
      { value: "6ª", label: "6ª" },
      { value: "7ª", label: "7ª" },
      { value: "8ª", label: "8ª" },
    ],
    "Ladies & Veteranos": [
      { value: "+30", label: "+30 Años" },
      { value: "+40", label: "+40 Años" },
      { value: "+50", label: "+50 Años" },
      { value: "+55", label: "+55 Años" },
      { value: "Ladies", label: "Ladies" },
    ],
    Menores: [
      { value: "Sub-12", label: "Sub-12" },
      { value: "Sub-14", label: "Sub-14" },
      { value: "Sub-16", label: "Sub-16" },
      { value: "Sub-18", label: "Sub-18" },
    ],
  },
};

// ============================================================================
// HELPER: Obtener niveles dinámicos según asociación + categoría
// ============================================================================
export function getNivelesParaCategoria(
  asociacion: string,
  categoria: string,
): { value: string; label: string }[] {
  const nivelesAsoc = NIVELES_POR_ASOCIACION_CATEGORIA[asociacion];
  if (!nivelesAsoc) return [];
  return nivelesAsoc[categoria] || [];
}

// ============================================================================
// HELPER: Obtener categorías según asociación
// ============================================================================
export function getCategoriasParaAsociacion(
  asociacion: string,
): { value: string; label: string }[] {
  return CATEGORIAS_POR_ASOCIACION[asociacion] || CATEGORIAS_POR_ASOCIACION.FAP;
}

// ============================================================================
// ALCANCE POR ROL DE USUARIO
// Regla de negocio: un Club no puede crear torneos nacionales.
// ============================================================================
type AlcanceOption = {
  value: string;
  label: string;
  disabled?: boolean;
  tooltip?: string;
};

const TODOS_LOS_ALCANCES: AlcanceOption[] = [
  { value: "Local", label: "Local / Privado" },
  { value: "Provincial", label: "Provincial" },
  { value: "Regional", label: "Regional" },
  { value: "Nacional", label: "Nacional" },
];

export function getAlcancesPermitidos(rol: RolUsuario): AlcanceOption[] {
  switch (rol) {
    case "admin":
    case "admin_club":
      // Club: Local, Regional, Provincial — sin Nacional
      return TODOS_LOS_ALCANCES.map((a) => {
        if (a.value === "Nacional") {
          return {
            ...a,
            disabled: true,
            tooltip:
              "Solo la Federación o Asociación Provincial puede organizar torneos nacionales.",
          };
        }
        return a;
      });

    case "admin_provincial":
      // Asociación Provincial: Provincial, Regional, Local — sin Nacional
      return TODOS_LOS_ALCANCES.map((a) => {
        if (a.value === "Nacional") {
          return {
            ...a,
            disabled: true,
            tooltip:
              "Solo la Federación Nacional puede organizar torneos nacionales.",
          };
        }
        return a;
      });

    case "admin_federacion":
    case "superadmin":
      // Federación nacional: sin Local/Privado (solo Provincial / Regional / Nacional)
      return TODOS_LOS_ALCANCES.filter((a) => a.value !== "Local");

    default:
      return TODOS_LOS_ALCANCES;
  }
}

/** Reglamentos visibles según rol: Amateur oculto solo para federación nacional. */
export function getReglamentosPermitidos(
  rol: RolUsuario,
): { value: ReglamentoTorneo; label: string }[] {
  if (esRolFederacionNacional(rol)) {
    return REGLAMENTOS_TORNEO.filter((r) => r.value !== "Amateur");
  }
  return [...REGLAMENTOS_TORNEO];
}

export function esAsociacionActiva(a: {
  estado?: string | null;
  estado_aprobacion?: string | null;
}): boolean {
  const estado = (a.estado || "").toLowerCase();
  const aprob = (a.estado_aprobacion || "").toLowerCase();
  if (estado === "inactivo" || estado === "pendiente") return false;
  if (aprob === "inactivo" || aprob === "pendiente_aprobacion" || aprob === "rechazado") {
    return false;
  }
  return true;
}

export function esAsociacionFap(a: {
  sigla?: string | null;
  nombre?: string | null;
  tipo?: string | null;
}): boolean {
  const sigla = (a.sigla || "").toUpperCase();
  if (sigla === "FAP") return true;
  if (/federaci[oó]n argentina/i.test(a.nombre || "")) return true;
  if ((a.tipo || "").toLowerCase() === "federacion" && /fap/i.test(a.nombre || "")) {
    return true;
  }
  return false;
}

/**
 * Padrón organizador: FAP + asociaciones/agrupaciones del ecosistema FAP
 * (excluye otras federaciones madre tipo APA como organizadora del circuito FAP).
 */
export function filtrarAsociacionesOrganizadorasFap<
  T extends {
    id: string;
    nombre?: string | null;
    sigla?: string | null;
    tipo?: string | null;
    estado?: string | null;
    estado_aprobacion?: string | null;
  },
>(list: T[]): T[] {
  return list.filter((a) => {
    if (!esAsociacionActiva(a)) return false;
    if (esAsociacionFap(a)) return true;
    const tipo = (a.tipo || "asociacion").toLowerCase();
    // Asociaciones / agrupaciones provinciales del padrón FAP
    if (tipo === "asociacion" || tipo === "agrupacion") return true;
    // Otras federaciones (ej. APA) no organizan el circuito FAP
    if (tipo === "federacion") return false;
    return true;
  });
}

export function findFapAsociacion<
  T extends {
    id: string;
    nombre?: string | null;
    sigla?: string | null;
    tipo?: string | null;
  },
>(list: T[]): T | undefined {
  return (
    list.find((a) => esAsociacionFap(a)) ||
    list.find((a) => (a.tipo || "").toLowerCase() === "federacion")
  );
}

/** Alcance Nacional siempre organiza FAP. */
export function debeForzarOrganizadorFap(alcance: string | null | undefined): boolean {
  return /nacional/i.test(String(alcance || "").trim());
}

/** Amateur / Independiente: todos los roles excepto federación nacional. */
export function puedeUsarReglamentoAmateur(rol: RolUsuario): boolean {
  return !esRolFederacionNacional(rol);
}

/**
 * Armado de zonas según reglamento del Paso 1.
 * - FAP / APA: preferir 3; sobrante 1 → zona de 4 en A; sobrante 2 → zonas de 4 en A y B
 * - Amateur: preferir 4 (formato club / independiente más flexible)
 */
export function getCapacidadesZonasPorReglamento(
  total: number,
  reglamento?: string | null,
): number[] {
  const regl = String(reglamento || "FAP").toUpperCase();
  if (regl === "AMATEUR") {
    return getCapacidadesZonasPreferidas(total, 4);
  }
  // FAP y APA usan el mismo criterio de grupos
  return getCapacidadesZonasPreferidas(total, 3);
}

/** Capacidad de zonas FAP: preferir 3; sobrante 1 → zona de 4 en A; sobrante 2 → zonas de 4 en A y B. */
export function getCapacidadesZonasFap(total: number): number[] {
  return getCapacidadesZonasPreferidas(total, 3);
}

/** Capacidad de zonas FAP: preferir 3; sobrante 1 → zona de 4 en A; sobrante 2 → zonas de 4 en A y B. */
function getCapacidadesZonasPreferidas(
  total: number,
  preferredSize: 3 | 4,
): number[] {
  if (total < 3) return total > 0 ? [total] : [];
  if (preferredSize === 3) {
    const mod = total % 3;
    if (mod === 0) return Array(total / 3).fill(3);
    if (mod === 1) {
      const count3 = Math.floor((total - 4) / 3);
      if (count3 >= 0) return [4, ...Array(count3).fill(3)];
    }
    if (mod === 2) {
      const count3 = Math.floor((total - 8) / 3);
      if (count3 >= 0) return [4, 4, ...Array(count3).fill(3)];
    }
    if (total === 5) return [3, 2];
    if (total === 4) return [4];
  } else {
    const mod = total % 4;
    if (mod === 0) return Array(total / 4).fill(4);
    if (mod === 1) {
      const count4 = Math.floor((total - 9) / 4);
      if (count4 >= 0) return [...Array(count4).fill(4), 3, 3, 3];
    }
    if (mod === 2) {
      const count4 = Math.floor((total - 6) / 4);
      if (count4 >= 0) return [...Array(count4).fill(4), 3, 3];
    }
    if (mod === 3) {
      const count4 = Math.floor((total - 3) / 4);
      if (count4 >= 0) return [...Array(count4).fill(4), 3];
    }
    if (total === 5) return [3, 2];
    if (total === 3) return [3];
  }
  const count = Math.max(1, Math.floor(total / preferredSize));
  const baseCap = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }).map((_, idx) =>
    idx < remainder ? baseCap + 1 : baseCap,
  );
}

/** Ej: "4 zonas de 3 + 2 de 4" */
export function resumirCapacidadesZonas(capacidades: number[]): string {
  if (capacidades.length === 0) return "Sin zonas";
  const freq = new Map<number, number>();
  for (const c of capacidades) {
    freq.set(c, (freq.get(c) || 0) + 1);
  }
  const parts = [...freq.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([size, n]) =>
      n === 1 ? `1 zona de ${size}` : `${n} zonas de ${size}`,
    );
  return parts.join(" + ");
}

/** Torneo del circuito federativo: sin método de pago en confirmación manual. */
export function esTorneoContextoFederacion(
  torneo: {
    alcance?: string | null;
    reglamento?: string | null;
    asociacion?: string | null;
  },
  rol?: RolUsuario | string | null,
): boolean {
  if (rol === "admin_federacion" || rol === "superadmin") return true;
  if (/nacional/i.test(String(torneo.alcance || ""))) return true;
  const regl = String(torneo.reglamento || torneo.asociacion || "").toUpperCase();
  return regl === "FAP";
}

/**
 * Planilla de inscripción FAP (con columna LETRA) vs General (con ORDEN).
 * Solo depende del torneo, no del rol del admin que descarga.
 */
export function usarPlanillaInscripcionFap(torneo: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}): boolean {
  if (/nacional/i.test(String(torneo.alcance || ""))) return true;
  const regl = String(torneo.reglamento || torneo.asociacion || "")
    .trim()
    .toUpperCase();
  return regl === "FAP";
}

// Valor especial para opción "crear categoría/nivel personalizado"
export const CUSTOM_OPTION_VALUE = "__custom__";
