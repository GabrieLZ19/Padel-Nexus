import { FAP_ESTADOS_TORNEO } from "./fap";

// 1. Definimos los tipos para mayor seguridad
export type NivelPadel = "1ª" | "2ª" | "3ª" | "4ª" | "5ª" | "6ª" | "7ª" | "8ª";
export type LadoPadel = "Drive" | "Revés" | "Ambos";

// 2. Definimos las constantes
export const NIVELES_PADEL = [
  { value: "1ª", label: "1ª Categoría" },
  { value: "2ª", label: "2ª Categoría" },
  { value: "3ª", label: "3ª Categoría" },
  { value: "4ª", label: "4ª Categoría" },
  { value: "5ª", label: "5ª Categoría" },
  { value: "6ª", label: "6ª Categoría" },
  { value: "7ª", label: "7ª Categoría" },
  { value: "8ª", label: "8ª Categoría" },
  { value: "Inicial", label: "Inicial" },
] as const;

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
  { value: "Duplas", label: "Duplas" },
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
