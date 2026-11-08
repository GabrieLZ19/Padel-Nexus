const ETIQUETAS: Record<string, string> = {
  cambio_pareja_llave: "Cambio de pareja",
  override_rival_partido: "Cambio de pareja",
  corregir_resultado: "Corrección de resultado",
  notificar_sorteo_zona: "Notificación de sorteo",
  resolver_sorteo_zona: "Sorteo de zona",
};

export function etiquetaAccionAuditoria(accion?: string | null): string {
  const key = String(accion || "").trim().toLowerCase();
  if (!key) return "Acción administrativa";
  if (ETIQUETAS[key]) return ETIQUETAS[key];
  return key.replace(/_/g, " ");
}

export function textoResumenAuditoriaTorneo(detalles?: Record<string, unknown> | null): string | null {
  if (!detalles || typeof detalles !== "object") return null;
  const resumen = detalles.resumen;
  if (typeof resumen === "string" && resumen.trim()) return resumen.trim();
  return null;
}
