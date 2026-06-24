import { Request, Response } from "express";
import { PagoService } from "../services/pago.service";

export const PagoController = {
  /**
   * PATCH /api/pagos/confirmar-manual
   * Procesa el checkbox administrativo para inscripciones o licencias
   */
  async confirmarPagoManual(req: Request, res: Response): Promise<Response> {
    try {
      const { entidad_tipo, entidad_id, monto, metodo_pago } = req.body;
      const usuarioAdminId = req.user?.id;

      if (
        !entidad_tipo ||
        !entidad_id ||
        monto === undefined ||
        !usuarioAdminId
      ) {
        return res.status(400).json({
          exito: false,
          error: "Faltan datos obligatorios para procesar el recibo de pago.",
        });
      }

      if (entidad_tipo !== "inscripcion" && entidad_tipo !== "licencia") {
        return res.status(400).json({
          exito: false,
          error:
            "Tipo de entidad inválido. Debe ser 'inscripcion' o 'licencia'.",
        });
      }

      const resultado = await PagoService.registrarPagoManual({
        entidadTipo: entidad_tipo,
        entidadId: entidad_id,
        monto: Number(monto),
        metodoPago: metodo_pago || "Efectivo",
        usuarioAdminId,
      });

      return res.status(200).json({
        exito: true,
        mensaje: `Pago de ${entidad_tipo} registrado y verificado exitosamente.`,
        data: resultado,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al procesar el pago.";
      return res.status(400).json({ exito: false, error: message });
    }
  },
};
