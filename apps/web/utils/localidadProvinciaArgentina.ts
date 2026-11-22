import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";

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
  viedma: "Río Negro",
  bariloche: "Río Negro",
  "rio gallegos": "Santa Cruz",
  ushuaia: "Tierra del Fuego",
  "santiago del estero": "Santiago del Estero",
  "santa rosa": "La Pampa",
};

function normalizarClave(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function provinciaCanonicaArgentinaWeb(
  valor?: string | null,
): string | null {
  const raw = String(valor || "").trim();
  if (!raw) return null;
  const norm = normalizarClave(raw);
  const hit = PROVINCIAS_ARG.find(
    (p) =>
      normalizarClave(p.value) === norm ||
      normalizarClave(p.label) === norm,
  );
  return hit?.value ?? null;
}

export function inferirProvinciaDesdeLocalidadWeb(
  localidad?: string | null,
): string | null {
  const raw = String(localidad || "").trim();
  if (!raw) return null;
  const hit = LOCALIDAD_A_PROVINCIA[normalizarClave(raw)];
  return hit ? provinciaCanonicaArgentinaWeb(hit) ?? hit : null;
}