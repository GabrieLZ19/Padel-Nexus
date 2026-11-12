import { fechaLatina } from "@/utils/fechaArgentina";

export type EventoHistorialLicencia = {
  accion: string;
  detalles?: Record<string, unknown> | null;
};

export function etiquetaAccionHistorialLicencia(accion: string): string {
  switch (accion) {
    case "suspender_licencia":
      return "Suspensión";
    case "reactivar_licencia":
      return "Reactivación";
    case "cambiar_vencimiento_licencia":
      return "Cambio de vencimiento";
    default:
      return accion.replace(/_/g, " ");
  }
}

export function detalleTextoHistorialLicencia(
  ev: EventoHistorialLicencia,
): string {
  const d = ev.detalles ?? {};
  const partes: string[] = [];

  if (typeof d.motivo === "string" && d.motivo.trim()) {
    partes.push(d.motivo.trim());
  }

  if (d.fecha_anterior != null || d.fecha_nueva != null) {
    const desde = fechaLatina(String(d.fecha_anterior ?? ""));
    const hasta = fechaLatina(String(d.fecha_nueva ?? ""));
    if (desde || hasta) {
      partes.push(
        desde && hasta ? `${desde} → ${hasta}` : hasta || desde,
      );
    }
  }

  return partes.join(" · ");
}
