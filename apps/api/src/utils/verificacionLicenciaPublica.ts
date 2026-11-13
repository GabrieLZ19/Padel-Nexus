import { montoLicenciaDesdeSolicitud } from "./licenciaPago";
import type { EstadoLicenciaPublica } from "./estadoLicencia";

export function mensajeVerificacionLicenciaPublica(
  estado: EstadoLicenciaPublica,
  datosSolicitud?: Record<string, unknown> | null,
): string {
  if (estado === "activa") return "Carné federativo vigente.";
  if (estado === "vencida") return "El carné está vencido.";
  if (estado === "suspendida") return "El carné está suspendido.";
  if (estado === "en_tramite") {
    const datos = datosSolicitud || {};
    const pago = String(datos.estado_pago || "").toLowerCase();
    const monto = montoLicenciaDesdeSolicitud(datos);
    if (pago === "pendiente" && monto > 0) {
      return "Licencia en trámite. Pago pendiente de acreditación.";
    }
    if (pago === "pagado") {
      return "Licencia en trámite. Pendiente de aprobación.";
    }
    return "Licencia en trámite. Pendiente de aprobación.";
  }
  return "Licencia no válida.";
}

/**
 * En consultas públicas (QR / verificar sin rol CRM) no se expone titular ni DNI de menores,
 * aunque el carné esté vigente. Con sesión fiscal/club/organizador, `consultaAutorizada`.
 */
export function exponeIdentidadVerificacionPublica(
  esMenor: boolean | null | undefined,
  consultaAutorizada = false,
): boolean {
  if (esMenor) return consultaAutorizada;
  return true;
}
