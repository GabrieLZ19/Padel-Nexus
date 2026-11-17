import { parseMercadoPagoExternalReference } from "../config/mercadopago";
import { InscripcionService } from "./inscripcion.service";
import { LicenciaService } from "./licencia.service";
import { ReservaService } from "./reserva.service";

/**
 * Acredita un pago MP según external_reference (usado por webhooks y fallback URL global).
 */
export async function acreditarPagoMercadoPago(
  externalReference: string,
  paymentId: string,
  monto: number,
): Promise<void> {
  const entidad = parseMercadoPagoExternalReference(externalReference);

  switch (entidad.canal) {
    case "inscripcion":
      await InscripcionService.confirmarPagoInscripcionDesdeWebhook(
        entidad.id,
        paymentId,
        monto,
      );
      return;
    case "licencia":
      await LicenciaService.confirmarPagoLicenciaDesdeWebhook(
        entidad.id,
        paymentId,
        monto,
      );
      return;
    case "reserva":
      await ReservaService.confirmarPagoPorId(
        entidad.id,
        monto,
        "MercadoPago",
        paymentId,
      );
      return;
    default:
      console.warn(
        `Webhook MP: external_reference no reconocida (${externalReference})`,
      );
  }
}