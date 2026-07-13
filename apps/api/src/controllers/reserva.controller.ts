import { Request, Response } from "express";
import { ReservaService } from "../services/reserva.service";
import { MercadoPagoConfig, Payment } from "mercadopago";

export const ReservasController = {
  /**
   * GET /api/reservas/disponibles?club_id=X&fecha=YYYY-MM-DD
   * Retorna la grilla de disponibilidad de turnos para un club y fecha.
   */
  async getDisponibilidad(req: Request, res: Response) {
    try {
      const { club_id, fecha } = req.query;

      if (!club_id || !fecha) {
        return res.status(400).json({
          exito: false,
          error: "Se requieren los parámetros club_id y fecha.",
        });
      }

      const slots = await ReservaService.obtenerDisponibilidad(
        club_id as string,
        fecha as string,
      );

      return res.status(200).json({ exito: true, data: slots });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/reservas
   * Crea una reserva en estado pendiente tras validar solapamiento.
   */
  async crearReserva(req: Request, res: Response) {
    try {
      const { turno_id, fecha_reserva } = req.body;
      const usuario_id = req.user?.id;

      if (!usuario_id) {
        return res
          .status(401)
          .json({ exito: false, error: "No autenticado." });
      }

      if (!turno_id || !fecha_reserva) {
        return res.status(400).json({
          exito: false,
          error: "Se requieren turno_id y fecha_reserva.",
        });
      }

      const reserva = await ReservaService.crearReserva({
        turno_id,
        usuario_id,
        fecha_reserva,
      });

      return res.status(201).json({ exito: true, data: reserva });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";

      if (message === "TURNO_OCUPADO") {
        return res.status(409).json({
          exito: false,
          error: "La cancha ya está reservada en ese horario.",
        });
      }

      if (message === "FECHA_PASADA") {
        return res.status(400).json({
          exito: false,
          error: "No se pueden realizar reservas para fechas u horarios que ya han pasado.",
        });
      }

      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * GET /api/reservas/:id
   * Obtiene el detalle de una reserva con datos de turno, cancha y club.
   */
  async getReservaPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await ReservaService.obtenerReservaPorId(id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(404).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/reservas/:id/pagar
   * Confirma el pago de una reserva (preparado para MercadoPago).
   */
  async pagarReserva(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const usuario_id = req.user?.id;
      const { monto, metodo_pago, referencia_pago } = req.body;

      if (!usuario_id) {
        return res
          .status(401)
          .json({ exito: false, error: "No autenticado." });
      }

      if (!monto || !metodo_pago) {
        return res.status(400).json({
          exito: false,
          error: "Se requieren monto y metodo_pago.",
        });
      }

      const pago = await ReservaService.confirmarPago(
        id,
        usuario_id,
        parseFloat(monto),
        metodo_pago,
        referencia_pago,
      );

      return res.status(200).json({ exito: true, data: pago });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/reservas/:id/cancelar
   * Cancela una reserva pendiente del usuario autenticado.
   */
  async cancelarReserva(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const usuario_id = req.user?.id;

      if (!usuario_id) {
        return res
          .status(401)
          .json({ exito: false, error: "No autenticado." });
      }

      await ReservaService.cancelarReserva(id, usuario_id);
      return res
        .status(200)
        .json({ exito: true, message: "Reserva cancelada correctamente." });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  /**
   * GET /api/reservas/club/:club_id
   * Obtiene las reservas de un club (para administradores).
   */
  async getReservasPorClub(req: Request, res: Response) {
    try {
      const { club_id } = req.params;
      const { fecha } = req.query;

      const data = await ReservaService.obtenerReservasClub(
        club_id,
        fecha as string | undefined,
      );

      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/reservas/:id/preferencia-mp
   * Crea una preferencia de pago en Mercado Pago para la reserva dada.
   */
  async crearPreferenciaPago(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await ReservaService.crearPreferenciaPago(id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/reservas/webhook/mercadopago
   * Webhook que recibe las notificaciones de pago IPN/Webhook de Mercado Pago.
   */
  async webhookMercadoPago(req: Request, res: Response) {
    try {
      const { type, action } = req.body;
      const topic = req.query.topic || req.body.topic;
      const paymentId = req.body.data?.id || req.query.id || req.query["data.id"];

      const isPaymentNotification = 
        type === "payment" || 
        topic === "payment" || 
        action === "payment.created" || 
        action === "payment.updated";

      if (isPaymentNotification && paymentId) {
        const mpClient = new MercadoPagoConfig({
          accessToken: process.env.MP_ACCESS_TOKEN || "TEST-TOKEN-MOCK",
        });
        const paymentClient = new Payment(mpClient);
        const paymentDetails = await paymentClient.get({ id: Number(paymentId) });

        if (paymentDetails.status === "approved") {
          const reservaId = paymentDetails.external_reference;
          const monto = paymentDetails.transaction_amount || 0;
          if (reservaId) {
            await ReservaService.confirmarPagoPorId(reservaId, monto, "MercadoPago", String(paymentId));
          }
        }
      }

      return res.status(200).send("OK");
    } catch (error: unknown) {
      console.error("Error en Webhook Mercado Pago:", error);
      return res.status(200).send("OK");
    }
  },

  /**
   * GET /api/reservas/turno/:id
   * Obtiene los detalles de un turno para mostrar en el checkout antes de reservar.
   */
  async getTurnoDetalles(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await ReservaService.obtenerTurnoConDetalles(id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(404).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/reservas/:id/confirmar-retorno
   * Endpoint de seguridad y fallback para confirmar el pago en local o al retornar del checkout.
   */
  async confirmarRetornoPago(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { payment_id } = req.body;

      if (!payment_id) {
        return res.status(400).json({
          exito: false,
          error: "Se requiere el payment_id de Mercado Pago.",
        });
      }

      // Consultar el estado del pago directamente en la API de Mercado Pago
      const mpClient = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN || "TEST-TOKEN-MOCK",
      });
      const paymentClient = new Payment(mpClient);
      
      let paymentDetails;
      try {
        paymentDetails = await paymentClient.get({ id: Number(payment_id) });
      } catch (mpErr) {
        // Fallback para simular pago exitoso si no hay token real o es de test/mock
        if (
          !process.env.MP_ACCESS_TOKEN || 
          process.env.MP_ACCESS_TOKEN === "TEST-TOKEN-MOCK" || 
          !/APP_USR-|TEST-/.test(process.env.MP_ACCESS_TOKEN)
        ) {
          const mockPago = await ReservaService.confirmarPagoPorId(id, 14000, "MercadoPago", String(payment_id));
          return res.status(200).json({ exito: true, data: mockPago });
        }
        throw mpErr;
      }

      if (paymentDetails.status === "approved") {
        const monto = paymentDetails.transaction_amount || 0;
        const pago = await ReservaService.confirmarPagoPorId(id, monto, "MercadoPago", String(payment_id));
        return res.status(200).json({ exito: true, data: pago });
      } else {
        return res.status(400).json({
          exito: false,
          error: `El pago no está aprobado. Estado actual: ${paymentDetails.status}`,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(500).json({ exito: false, error: message });
    }
  },
};
