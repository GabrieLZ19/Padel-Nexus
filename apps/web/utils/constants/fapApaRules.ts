import type { RolUsuario } from "../types/user.types";

// ============================================================================
// RAMAS (División por sexo)
// ============================================================================
export const RAMAS_PADEL = [
  { value: "Masculina", label: "Masculina" },
  { value: "Femenina", label: "Femenina" },
  { value: "Mixta", label: "Mixta" },
] as const;

export type RamaPadel = (typeof RAMAS_PADEL)[number]["value"];

// ============================================================================
// CUPOS OFICIALES FAP / APA (Sin BYEs impares)
// ============================================================================
export const CUPOS_ESTANDAR_FAP = [
  { value: "6", label: "6 Parejas / Jugadores (2 Zonas de 3)" },
  { value: "8", label: "8 Parejas / Jugadores (2 Zonas de 4 / Elim. Directa 8)" },
  { value: "12", label: "12 Parejas / Jugadores (4 Zonas de 3)" },
  { value: "16", label: "16 Parejas / Jugadores (4 Zonas de 4 / Elim. Directa 16)" },
  { value: "24", label: "24 Parejas / Jugadores (8 Zonas de 3)" },
  { value: "32", label: "32 Parejas / Jugadores (8 Zonas de 4 / Elim. Directa 32)" },
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
type AlcanceOption = { value: string; label: string; disabled?: boolean; tooltip?: string };

const TODOS_LOS_ALCANCES: AlcanceOption[] = [
  { value: "Local", label: "Local / Privado" },
  { value: "Regional", label: "Regional" },
  { value: "Provincial", label: "Provincial" },
  { value: "Nacional", label: "Nacional" },
];

export function getAlcancesPermitidos(rol: RolUsuario): AlcanceOption[] {
  switch (rol) {
    case "admin":
    case "admin_club":
      // Club: solo Local y Provincial (clasificatorio)
      return TODOS_LOS_ALCANCES.map((a) => {
        if (a.value === "Nacional") {
          return {
            ...a,
            disabled: true,
            tooltip: "Solo la Federación o Asociación Provincial puede organizar torneos nacionales.",
          };
        }
        return a;
      });

    case "admin_provincial":
      // Asociación Provincial: Provincial, Regional, Local, Clasificatorio
      return TODOS_LOS_ALCANCES.map((a) => {
        if (a.value === "Nacional") {
          return {
            ...a,
            disabled: true,
            tooltip: "Solo la Federación Nacional puede organizar torneos nacionales.",
          };
        }
        return a;
      });

    case "admin_federacion":
    case "superadmin":
      // Federación Nacional / Superadmin: Todos
      return TODOS_LOS_ALCANCES;

    default:
      return TODOS_LOS_ALCANCES;
  }
}

// Valor especial para opción "crear categoría/nivel personalizado"
export const CUSTOM_OPTION_VALUE = "__custom__";
