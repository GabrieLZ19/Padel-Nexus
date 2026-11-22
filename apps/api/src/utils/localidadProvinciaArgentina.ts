import { normalizarProvincia } from "../constants/rankings";
import { provinciaCanonicaArgentina } from "./provinciaRanking";

/** Clave normalizada de localidad -> provincia canónica. */
const LOCALIDAD_A_PROVINCIA: Record<string, string> = {
  plottier: "Neuquén",
  neuquen: "Neuquén",
  "san martin de los andes": "Neuquén",
  zapala: "Neuquén",
  "yerba buena": "Tucumán",
  "san miguel de tucuman": "Tucumán",
  tafí: "Tucumán",
  "san miguel": "Buenos Aires",
  "mar del plata": "Buenos Aires",
  "la plata": "Buenos Aires",
  "san isidro": "Buenos Aires",
  pilar: "Buenos Aires",
  "villa gesell": "Buenos Aires",
  "bahia blanca": "Buenos Aires",
  rosario: "Santa Fe",
  "santa fe": "Santa Fe",
  rafaela: "Santa Fe",
  cordoba: "Córdoba",
  "villa carlos paz": "Córdoba",
  "rio cuarto": "Córdoba",
  mendoza: "Mendoza",
  "san rafael": "Mendoza",
  "godoy cruz": "Mendoza",
  salta: "Salta",
  "san salvador de jujuy": "Jujuy",
  jujuy: "Jujuy",
  resistencia: "Chaco",
  corrientes: "Corrientes",
  posadas: "Misiones",
  formosa: "Formosa",
  parana: "Entre Ríos",
  "concepcion del uruguay": "Entre Ríos",
  "san juan": "San Juan",
  "san luis": "San Luis",
  "la rioja": "La Rioja",
  catamarca: "Catamarca",
  rawson: "Chubut",
  trelew: "Chubut",
  "viedma": "Río Negro",
  "bariloche": "Río Negro",
  "rio gallegos": "Santa Cruz",
  ushuaia: "Tierra del Fuego",
  "santiago del estero": "Santiago del Estero",
  "santa rosa": "La Pampa",
};

function claveLocalidad(valor: string): string {
  return normalizarProvincia(valor).replace(/\s+/g, " ");
}

/** Infiere provincia argentina a partir del nombre de localidad (sin geocoding). */
export function inferirProvinciaDesdeLocalidad(
  localidad?: string | null,
): string | null {
  const raw = String(localidad || "").trim();
  if (!raw) return null;
  const hit = LOCALIDAD_A_PROVINCIA[claveLocalidad(raw)];
  return hit ? provinciaCanonicaArgentina(hit) ?? hit : null;
}