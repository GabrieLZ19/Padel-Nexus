import { FAP_ESTADOS_TORNEO } from "./fap";

// 1. Definimos los tipos para mayor seguridad
export type NivelPadel =
  | "1ª"
  | "2ª"
  | "3ª"
  | "4ª"
  | "5ª"
  | "6ª"
  | "7ª"
  | "8ª"
  | "Inicial"
  | "Sub-10"
  | "Sub-12"
  | "Sub-14"
  | "Sub-16"
  | "Sub-18"
  | "Juniors +18"
  | "Seniors +30"
  | "Seniors +35"
  | "Seniors +40"
  | "Seniors +45"
  | "Seniors +50"
  | "Seniors +55"
  | "Seniors +60"
  | "Ladies A"
  | "Ladies B"
  | "Ladies C"
  | "Women +35"
  | "Women +45"
  | "Women +55";

export type LadoPadel = "Drive" | "Revés" | "Ambos";

// 2. Definimos las constantes maestras oficiales FAP / APA
export const NIVELES_PADEL = [
  // Libres
  { value: "1ª", label: "1ª Categoría (Profesional)", grupo: "Libres" },
  { value: "2ª", label: "2ª Categoría", grupo: "Libres" },
  { value: "3ª", label: "3ª Categoría", grupo: "Libres" },
  { value: "4ª", label: "4ª Categoría", grupo: "Libres" },
  { value: "5ª", label: "5ª Categoría", grupo: "Libres" },
  { value: "6ª", label: "6ª Categoría", grupo: "Libres" },
  { value: "7ª", label: "7ª Categoría", grupo: "Libres" },
  { value: "8ª", label: "8ª Categoría", grupo: "Libres" },
  { value: "Inicial", label: "Inicial", grupo: "Libres" },

  // Menores
  { value: "Sub-10", label: "Sub-10 (Menores)", grupo: "Menores" },
  { value: "Sub-12", label: "Sub-12 (Menores)", grupo: "Menores" },
  { value: "Sub-14", label: "Sub-14 (Menores)", grupo: "Menores" },
  { value: "Sub-16", label: "Sub-16 (Menores)", grupo: "Menores" },
  { value: "Sub-18", label: "Sub-18 (Menores)", grupo: "Menores" },
  {
    value: "Sub-12 Promocional",
    label: "Sub-12 Promocional",
    grupo: "Menores",
  },
  {
    value: "Sub-14 Promocional",
    label: "Sub-14 Promocional",
    grupo: "Menores",
  },
  {
    value: "Sub-16 Promocional",
    label: "Sub-16 Promocional",
    grupo: "Menores",
  },

  // Ladies & Veteranos / Seniors
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

/** Niveles para convocatorias "Nos falta uno" (categorías Libres FAP/APA). */
export const NIVELES_PARTIDO_ABIERTO = NIVELES_PADEL.filter(
  (n) => n.grupo === "Libres",
);

export const NIVEL_PARTIDO_DEFAULT: NivelPadel = "5ª";

export const LADOS_PADEL = [
  { value: "Drive", label: "Drive" },
  { value: "Revés", label: "Revés" },
  { value: "Ambos", label: "Ambos" },
] as const;

export const PROVINCIAS_ARG = [
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

export const CATEGORIAS_TORNEO = [
  { value: "Libres", label: "Libres" },
  { value: "Ladies & Veteranos", label: "Ladies & Veteranos" },
  { value: "Menores", label: "Menores" },
] as const;

export const ESTADOS_TORNEO = [
  { value: FAP_ESTADOS_TORNEO.BORRADOR, label: "Borrador (Oculto)" },
  { value: FAP_ESTADOS_TORNEO.INSCRIPCION, label: "Inscripción Abierta" },
  { value: FAP_ESTADOS_TORNEO.EN_CURSO, label: "En Curso" },
  { value: FAP_ESTADOS_TORNEO.FINALIZADO, label: "Finalizado" },
] as const;

export const MODALIDADES_TORNEO = [
  { value: "Parejas", label: "Parejas" },
  { value: "Individual", label: "Individual" },
] as const;

export const FORMATOS_TORNEO = [
  { value: "Eliminatoria Directa", label: "Eliminatoria Directa" },
  { value: "Fase de Grupos", label: "Fase de Grupos + Llave" },
] as const;

export const ALCANCES_TORNEO = [
  { value: "Local", label: "Local / Privado" },
  { value: "Regional", label: "Regional" },
  { value: "Provincial", label: "Provincial" },
  { value: "Nacional", label: "Nacional" },
] as const;
