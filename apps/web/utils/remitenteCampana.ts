import type {
  ComunicacionesCampana,
  ComunicacionesCanal,
} from "@/utils/types/comunicaciones.types";

const ETIQUETA_POR_ROL: Record<string, string> = {
  admin_federacion: "Federación",
  superadmin: "Padel Nexus",
  admin_provincial: "Asociación provincial",
  admin_club: "Club",
  admin: "Administración",
};

/** Nombre institucional para historial (sin rol técnico ni nombre de cuenta). */
export function remitenteCampanaLegible(
  campana: Pick<ComunicacionesCampana, "metricas" | "creador">,
): string {
  const entidad = campana.metricas?.entidad_remitente?.trim();
  if (entidad) return entidad;
  const rol = campana.creador?.rol;
  if (rol && ETIQUETA_POR_ROL[rol]) return ETIQUETA_POR_ROL[rol];
  return "Institución";
}

export const ETIQUETA_CANAL_UI: Record<ComunicacionesCanal, string> = {
  in_app: "In-app",
  email: "Email",
  whatsapp: "WhatsApp",
};

export function etiquetasCanalesLegibles(
  canales: ComunicacionesCanal[] | undefined,
): string {
  const orden: ComunicacionesCanal[] = ["in_app", "email", "whatsapp"];
  const set = new Set(canales?.length ? canales : (["in_app"] as const));
  const labels = orden.filter((c) => set.has(c)).map((c) => ETIQUETA_CANAL_UI[c]);
  if (labels.length === 0) return "In-app";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}
