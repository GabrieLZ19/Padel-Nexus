import { Request, Response } from "express";
import { MercadoPagoConfig, Payment } from "mercadopago";
import {
  getMercadoPagoAccessToken,
  verifyMercadoPagoWebhookSignature,
} from "../config/mercadopago";
import { InscripcionService } from "../services/inscripcion.service";
import { assertJugador1EsUsuarioSesion } from "../utils/inscripcionAutorizacion";
import { acreditarPagoMercadoPago } from "../services/mercadopagoWebhook.service";
import type { FilaPlanillaInscripcion } from "../utils/inscripcionPlanilla";
import { AlcanceCuentaService } from "../services/alcanceCuenta.service";
import { supabaseAdmin } from "../config/supabase";
export const getAllInscripciones = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const {
      torneo_id,
      page = "1",
      limit = "10",
      search,
      estado_pago,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const cuenta = await AlcanceCuentaService.resolver(req.user);
    let torneoIds: string[] | undefined;

    if (cuenta.rol === "admin_provincial") {
      if (!cuenta.provincia) {
        return res.status(200).json({
          data: [],
          total: 0,
          aviso: cuenta.aviso,
          resumen: { pendientes: 0, confirmadas: 0, rechazadas: 0, recaudacion: 0 },
        });
      }
      const clubIds = await AlcanceCuentaService.idsClubesDeProvincia(cuenta.provincia);
      if (clubIds.length === 0) {
        torneoIds = [];
      } else {
        const { data: torneosProvincia } = await supabaseAdmin
          .from("torneos")
          .select("id")
          .in("club_id", clubIds)
          .neq("alcance", "Nacional");
        torneoIds = (torneosProvincia || []).map((torneo) => torneo.id as string);
      }
      if (typeof torneo_id === "string" && torneo_id && !torneoIds.includes(torneo_id)) {
        return res.status(403).json({ message: "Esa inscripción no es de tu provincia." });
      }
    }

    const resultado = await InscripcionService.obtenerInscripcionesPaginadas(
      torneo_id as string | undefined,
      pageNum,
      limitNum,
      {
        search: typeof search === "string" ? search : undefined,
        estadoPago: typeof estado_pago === "string" ? estado_pago : undefined,
        torneoIds: torneo_id ? undefined : torneoIds,
      },
    );

    const resumen = await InscripcionService.obtenerResumenInscripciones(
      torneo_id as string | undefined,
      torneo_id ? undefined : torneoIds,
    );

    return res.status(200).json({ ...resultado, resumen, aviso: cuenta.aviso });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res
      .status(500)
      .json({ message: "Error al obtener inscripciones", error: message });
  }
};

export const createInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const {
      torneo_id,
      usuario_id: usuarioIdBody,
      jugador1_nombre,
      jugador2_nombre,
      usuario2_email,
      monto,
      letraPrioridad,
    } = req.body;

    const usuarioSesionId = req.user?.id;
    if (!usuarioSesionId) {
      return res.status(401).json({ message: "No autorizado." });
    }

    if (!torneo_id) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    try {
      assertJugador1EsUsuarioSesion(usuarioSesionId, usuarioIdBody);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(403).json({
        message: "No se pudo procesar la inscripción.",
        error: message,
      });
    }

    const nuevaInscripcion = await InscripcionService.registrarInscripcion({
      torneoId: torneo_id,
      usuarioSolicitanteId: usuarioSesionId,
      jugador1Id: usuarioSesionId,
      jugador2Email: usuario2_email,
      jugador1Nombre: jugador1_nombre,
      jugador2Nombre: jugador2_nombre,
      monto,
      letraPrioridad,
    });

    return res.status(201).json(nuevaInscripcion);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";

    return res.status(400).json({
      message: "No se pudo procesar la inscripción.",
      error: message,
    });
  }
};

export const updateEstadoPago = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { estado_pago } = req.body;
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ message: "No autorizado." });
    }

    if (!estado_pago)
      return res
        .status(400)
        .json({ message: "Debe enviar un estado de pago válido." });

    const data = await InscripcionService.actualizarEstadoPago(
      id,
      estado_pago,
      { id: usuarioId, rol: req.user?.rol },
    );

    return res.status(200).json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    const status = message.includes("no encontrada")
      ? 404
      : message.includes("No tenés permiso")
        ? 403
        : 500;
    return res.status(status).json({
      message: "Error al actualizar estado",
      error: message,
    });
  }
};

export const deleteInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ message: "No autorizado." });
    }

    await InscripcionService.cancelarInscripcion(id, {
      id: usuarioId,
      rol: req.user?.rol,
    });

    return res
      .status(200)
      .json({ message: "Inscripción cancelada y cupo liberado" });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    const status = message.includes("no encontrada")
      ? 404
      : message.includes("No tenés permiso")
        ? 403
        : 500;
    return res.status(status).json({
      message: "Error al cancelar inscripción",
      error: message,
    });
  }
};

export const createInscripcionManual = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const {
      torneo_id,
      jugador1_identificador,
      jugador2_identificador,
      monto,
      metodo_pago,
      omitir_validaciones,
      motivo,
      letra_prioridad,
      letraPrioridad,
      jugador1_datos,
      jugador2_datos,
    } = req.body;

    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ message: "No autorizado." });
    }

    if (!torneo_id || !jugador1_identificador || monto === undefined || monto === null) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    const nuevaInscripcion = await InscripcionService.registrarInscripcionManual({
      torneoId: torneo_id,
      jugador1Identificador: jugador1_identificador,
      jugador2Identificador: jugador2_identificador,
      jugador1Datos:
        jugador1_datos && typeof jugador1_datos === "object"
          ? jugador1_datos
          : undefined,
      jugador2Datos:
        jugador2_datos && typeof jugador2_datos === "object"
          ? jugador2_datos
          : undefined,
      monto: Number(monto),
      metodoPago: metodo_pago,
      adminId,
      omitirValidaciones: Boolean(omitir_validaciones),
      motivo: typeof motivo === "string" ? motivo : undefined,
      letraPrioridad:
        typeof letra_prioridad === "string"
          ? letra_prioridad
          : typeof letraPrioridad === "string"
            ? letraPrioridad
            : undefined,
    });

    return res.status(201).json(nuevaInscripcion);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({
      message: "No se pudo procesar la inscripción manual.",
      error: message,
    });
  }
};

export const importarPlanillaInscripciones = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ message: "No autorizado." });
    }

    const { torneo_id, filas, modalidad, omitir_validaciones, motivo } =
      req.body as {
        torneo_id?: string;
        filas?: FilaPlanillaInscripcion[];
        modalidad?: string;
        omitir_validaciones?: boolean;
        motivo?: string;
      };

    if (!torneo_id || !Array.isArray(filas) || filas.length === 0) {
      return res.status(400).json({
        message: "torneo_id y filas de planilla son obligatorios.",
      });
    }

    const resultado = await InscripcionService.importarDesdePlanilla({
      torneoId: torneo_id,
      adminId,
      filas,
      modalidad,
      omitirValidaciones:
        omitir_validaciones === undefined ? true : Boolean(omitir_validaciones),
      motivo,
    });

    return res.status(200).json({ exito: true, ...resultado });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({
      message: "No se pudo importar la planilla.",
      error: message,
    });
  }
};

export const webhookMercadoPagoInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    if (!verifyMercadoPagoWebhookSignature(req)) {
      return res.status(401).send("Invalid webhook signature");
    }

    const { type, action } = req.body;
    const topic = req.query.topic || req.body.topic;
    const paymentId =
      req.body.data?.id || req.query.id || req.query["data.id"];

    const isPaymentNotification =
      type === "payment" ||
      topic === "payment" ||
      action === "payment.created" ||
      action === "payment.updated";

    if (isPaymentNotification && paymentId) {
      const token = getMercadoPagoAccessToken();
      if (token) {
        const mpClient = new MercadoPagoConfig({ accessToken: token });
        const paymentClient = new Payment(mpClient);
        const paymentDetails = await paymentClient.get({
          id: Number(paymentId),
        });

        if (
          paymentDetails.status === "approved" &&
          paymentDetails.external_reference
        ) {
          const monto = paymentDetails.transaction_amount ?? 0;
          await acreditarPagoMercadoPago(
            String(paymentDetails.external_reference),
            String(paymentId),
            monto,
          );
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error: unknown) {
    console.error("Error en Webhook Mercado Pago (inscripciones):", error);
    return res.status(200).send("OK");
  }
};

export const obtenerPlazasPagoInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ message: "No autorizado." });
    }
    const data = await InscripcionService.obtenerEstadoPlazasPago(
      req.params.id,
      usuarioId,
    );
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ message, error: message });
  }
};

export const previewCheckoutMercadoPagoInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ message: "No autorizado." });
    }
    const alcanceRaw = req.query.alcance as string | undefined;
    const alcance =
      alcanceRaw === "mi_plaza" ? "mi_plaza" : "todas_pendientes";
    const data = await InscripcionService.previewCheckoutMercadoPago(
      req.params.id,
      usuarioId,
      alcance,
    );
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ message, error: message });
  }
};

export const crearPreferenciaPagoInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ message: "No autorizado." });
    }
    const mobile = (req.get("x-padel-client") || "").toLowerCase() === "mobile";
    const alcanceRaw = req.body?.alcance as string | undefined;
    const alcance =
      alcanceRaw === "mi_plaza" ? "mi_plaza" : "todas_pendientes";
    const data = await InscripcionService.crearPreferenciaPago(
      req.params.id,
      usuarioId,
      { mobile, alcance },
    );
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({
      message: "No se pudo iniciar el pago de la inscripción.",
      error: message,
    });
  }
};

export const confirmarRetornoPagoInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ message: "No autorizado." });
    }
    const paymentId = req.body?.payment_id as string | undefined;
    if (!paymentId) {
      return res.status(400).json({
        message: "Se requiere el payment_id de Mercado Pago.",
      });
    }

    const data = await InscripcionService.confirmarPagoInscripcionRetorno(
      req.params.id,
      usuarioId,
      paymentId,
    );
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo confirmar el pago de la inscripción.";
    return res.status(400).json({ exito: false, error: message });
  }
};

export const getElegibilidadInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const torneoId =
      typeof req.query.torneo_id === "string" ? req.query.torneo_id : "";
    const usuario2Email =
      typeof req.query.usuario2_email === "string"
        ? req.query.usuario2_email
        : undefined;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ message: "No autorizado." });
    }
    if (!torneoId) {
      return res.status(400).json({ message: "torneo_id es obligatorio." });
    }

    const data = await InscripcionService.evaluarElegibilidad({
      torneoId,
      usuarioId,
      usuario2Email,
    });

    return res.status(200).json({ exito: true, ...data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({
      message: "No se pudo evaluar la elegibilidad.",
      error: message,
    });
  }
};
