/**
 * Constantes de rankings.
 *
 * `TipoRanking` agrupa las 3 grandes familias que pide el reglamento:
 * - `menores`   → categorías Sub-XX (jugadores en desarrollo).
 * - `veteranos` → categorías +30/+40/+50 (Ladies y Veteranos).
 * - `libres`    → 1ª a 8ª (Damas / Caballeros libres).
 *
 * La `rama` la resolvemos contra `perfiles.sexo` porque `rankings.rama`
 * en la base actual no distingue Damas/Caballeros de forma confiable.
 */

export const TIPOS_RANKING = ["menores", "veteranos", "libres"] as const;
export type TipoRanking = (typeof TIPOS_RANKING)[number];

export const RAMAS_RANKING = ["masculino", "femenino"] as const;
export type RamaRanking = (typeof RAMAS_RANKING)[number];

/**
 * Categorias consideradas "menores" (Sub-XX). Debe mantenerse alineado con
 * `NIVELES_PADEL` en `apps/web/utils/constants/padelConfig.ts`.
 */
export const CATEGORIAS_MENORES = [
  "Sub-10",
  "Sub-12",
  "Sub-14",
  "Sub-16",
  "Sub-18",
  "Sub-12 Promocional",
  "Sub-14 Promocional",
  "Sub-16 Promocional",
] as const;

/**
 * Categorias de Ladies (femenino) y Veteranos (masculino).
 * Incluye Seniors +XX, Juniors +18, Ladies A/B/C y Women +XX.
 */
export const CATEGORIAS_VETERANOS = [
  "Juniors +18",
  "Seniors +30",
  "Seniors +35",
  "Seniors +40",
  "Seniors +45",
  "Seniors +50",
  "Seniors +55",
  "Seniors +60",
  "Ladies A",
  "Ladies B",
  "Ladies C",
  "Women +35",
  "Women +45",
  "Women +55",
] as const;

/**
 * Categorias libres (competitivas por nivel).
 *
 * Incluimos variantes ordinales coloquiales (`1ra`, `2da`, `3ra`, ...) porque
 * la base actual mezcla notaciones (`5ª` y `6ta` conviven). Todas se consideran
 * validas para el ranking de Libres.
 */
export const CATEGORIAS_LIBRES = [
  "1ª",
  "2ª",
  "3ª",
  "4ª",
  "5ª",
  "6ª",
  "7ª",
  "8ª",
  "1ra",
  "2da",
  "3ra",
  "4ta",
  "5ta",
  "6ta",
  "7ma",
  "8va",
  "Inicial",
] as const;

/**
 * Devuelve la lista de categorías que aplican para un tipo de ranking.
 * Se usa para construir el filtro `.in("categoria", …)` en la query.
 */
export function categoriasPorTipoRanking(
  tipo: TipoRanking,
): readonly string[] {
  switch (tipo) {
    case "menores":
      return CATEGORIAS_MENORES;
    case "veteranos":
      return CATEGORIAS_VETERANOS;
    case "libres":
      return CATEGORIAS_LIBRES;
  }
}

/**
 * Une notaciones de la misma categoría (`6ª`, `6ta`, `6TA`).
 * El valor guardado no se reescribe: solo sirve para filtrar y comparar.
 */
export function claveCategoria(valor: string): string {
  const base = valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ªº]/g, "");
  const ordinal = base.match(/^(\d+)\s*(?:ra|da|ta|ma|va)?$/);
  if (ordinal) return ordinal[1];
  return base.replace(/\s+/g, " ");
}

/** Valores de `rankings.categoria` que representan la misma categoría. */
export function variantesCategoria(categoria: string): string[] {
  const clave = claveCategoria(categoria);
  const conocidas = [
    ...CATEGORIAS_LIBRES,
    ...CATEGORIAS_MENORES,
    ...CATEGORIAS_VETERANOS,
  ].filter((item) => claveCategoria(item) === clave);
  return [...new Set([categoria, ...conocidas])];
}

/**
 * Orden del ranking publicado:
 * 1. Puntos, de mayor a menor.
 * 2. Ante igualdad, apellido (A-Z, sin distinguir mayúsculas ni tildes).
 * 3. Si el apellido coincide, nombre con el mismo criterio.
 */
export function compararPosicionRanking(
  a: { puntos: number; apellido?: string | null; nombre?: string | null },
  b: { puntos: number; apellido?: string | null; nombre?: string | null },
): number {
  if (a.puntos !== b.puntos) return b.puntos - a.puntos;
  const apellido = (a.apellido || "").localeCompare(b.apellido || "", "es", {
    sensitivity: "base",
  });
  if (apellido !== 0) return apellido;
  return (a.nombre || "").localeCompare(b.nombre || "", "es", {
    sensitivity: "base",
  });
}

/**
 * Normaliza un nombre de provincia quitando acentos y bajando a minusculas.
 * Necesario porque `perfiles.lugar_residencia` mezcla `Cordoba` y `Cordoba`.
 */
export function normalizarProvincia(input?: string | null): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Normaliza texto libre de rama a los valores usados en `perfiles.sexo`. */
export function normalizarRama(input?: string | null): RamaRanking | null {
  if (!input) return null;
  const v = input.trim().toLowerCase();
  if (
    ["masculino", "caballeros", "hombres", "veteranos", "m", "male"].includes(v)
  ) {
    return "masculino";
  }
  if (["femenino", "damas", "mujeres", "ladies", "f", "female"].includes(v)) {
    return "femenino";
  }
  return null;
}
