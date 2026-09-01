export const NIVELES_PADEL = [
  { value: "1ª", label: "1ª Categoría (Profesional)", grupo: "Libres" },
  { value: "2ª", label: "2ª Categoría", grupo: "Libres" },
  { value: "3ª", label: "3ª Categoría", grupo: "Libres" },
  { value: "4ª", label: "4ª Categoría", grupo: "Libres" },
  { value: "5ª", label: "5ª Categoría", grupo: "Libres" },
  { value: "6ª", label: "6ª Categoría", grupo: "Libres" },
  { value: "7ª", label: "7ª Categoría", grupo: "Libres" },
  { value: "8ª", label: "8ª Categoría", grupo: "Libres" },
  { value: "Inicial", label: "Inicial", grupo: "Libres" },
  { value: "Sub-10", label: "Sub-10 (Menores)", grupo: "Menores" },
  { value: "Sub-12", label: "Sub-12 (Menores)", grupo: "Menores" },
  { value: "Sub-14", label: "Sub-14 (Menores)", grupo: "Menores" },
  { value: "Sub-16", label: "Sub-16 (Menores)", grupo: "Menores" },
  { value: "Sub-18", label: "Sub-18 (Menores)", grupo: "Menores" },
  { value: "Sub-12 Promocional", label: "Sub-12 Promocional", grupo: "Menores" },
  { value: "Sub-14 Promocional", label: "Sub-14 Promocional", grupo: "Menores" },
  { value: "Sub-16 Promocional", label: "Sub-16 Promocional", grupo: "Menores" },
  { value: "Juniors +18", label: "Juniors +18", grupo: "Ladies & Veteranos" },
  { value: "Seniors +30", label: "Seniors +30", grupo: "Ladies & Veteranos" },
  { value: "Seniors +35", label: "Seniors +35", grupo: "Ladies & Veteranos" },
  { value: "Seniors +40", label: "Seniors +40", grupo: "Ladies & Veteranos" },
  { value: "Seniors +45", label: "Seniors +45", grupo: "Ladies & Veteranos" },
  { value: "Seniors +50", label: "Seniors +50", grupo: "Ladies & Veteranos" },
  { value: "Seniors +55", label: "Seniors +55", grupo: "Ladies & Veteranos" },
  { value: "Seniors +60", label: "Seniors +60", grupo: "Ladies & Veteranos" },
  { value: "Ladies A", label: "Ladies A", grupo: "Ladies & Veteranos" },
  { value: "Ladies B", label: "Ladies B", grupo: "Ladies & Veteranos" },
  { value: "Ladies C", label: "Ladies C", grupo: "Ladies & Veteranos" },
  { value: "Women +35", label: "Women +35", grupo: "Ladies & Veteranos" },
  { value: "Women +45", label: "Women +45", grupo: "Ladies & Veteranos" },
  { value: "Women +55", label: "Women +55", grupo: "Ladies & Veteranos" },
] as const;

export const NIVELES_LIBRES_GRID = [
  "1ª",
  "2ª",
  "3ª",
  "4ª",
  "5ª",
  "6ª",
  "7ª",
  "8ª",
] as const;

export const NIVELES_OTRAS = NIVELES_PADEL.filter(
  (nivel) =>
    !NIVELES_LIBRES_GRID.includes(
      nivel.value as (typeof NIVELES_LIBRES_GRID)[number],
    ),
);

export const NIVEL_PARTIDO_DEFAULT = "5ª";

export const LADOS_PADEL = [
  { value: "Drive", label: "Drive" },
  { value: "Revés", label: "Revés" },
  { value: "Ambos", label: "Ambos" },
] as const;

export const SEXOS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro" },
] as const;

const PROVINCIAS_ARG = [
  { value: "Buenos Aires", label: "Buenos Aires" },
  { value: "Catamarca", label: "Catamarca" },
  { value: "Chaco", label: "Chaco" },
  { value: "Chubut", label: "Chubut" },
  { value: "CABA", label: "Ciudad Autónoma de Buenos Aires" },
  { value: "Córdoba", label: "Córdoba" },
  { value: "Corrientes", label: "Corrientes" },
  { value: "Entre Ríos", label: "Entre Ríos" },
  { value: "Formosa", label: "Formosa" },
  { value: "Jujuy", label: "Jujuy" },
  { value: "La Pampa", label: "La Pampa" },
  { value: "La Rioja", label: "La Rioja" },
  { value: "Mendoza", label: "Mendoza" },
  { value: "Misiones", label: "Misiones" },
  { value: "Neuquén", label: "Neuquén" },
  { value: "Río Negro", label: "Río Negro" },
  { value: "Salta", label: "Salta" },
  { value: "San Juan", label: "San Juan" },
  { value: "San Luis", label: "San Luis" },
  { value: "Santa Cruz", label: "Santa Cruz" },
  { value: "Santa Fe", label: "Santa Fe" },
  { value: "Santiago del Estero", label: "Santiago del Estero" },
  { value: "Tierra del Fuego", label: "Tierra del Fuego" },
  { value: "Tucumán", label: "Tucumán" },
] as const;

export type ProvinciaOption = (typeof PROVINCIAS_ARG)[number];

export { PROVINCIAS_ARG };
