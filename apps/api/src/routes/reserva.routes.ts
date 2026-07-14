import { Router } from "express";
import { ReservasController } from "../controllers/reserva.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ── Endpoints públicos (cualquier usuario autenticado) ─────────────────

// Consultar disponibilidad de turnos por club y fecha
router.get("/disponibles", authenticate, ReservasController.getDisponibilidad);

// Obtener reservas del usuario autenticado
router.get("/mis-reservas", authenticate, ReservasController.getMisReservas);

// Obtener detalle de una reserva
router.get("/:id", authenticate, ReservasController.getReservaPorId);

// Obtener detalles de un turno para el checkout antes de reservar
router.get("/turno/:id", authenticate, ReservasController.getTurnoDetalles);

// Crear nueva reserva (estado pendiente)
router.post("/", authenticate, ReservasController.crearReserva);

// Confirmar pago de una reserva (preparado para MercadoPago)
router.post("/:id/pagar", authenticate, ReservasController.pagarReserva);

// Crear preferencia de pago en Mercado Pago
router.post("/:id/preferencia-mp", authenticate, ReservasController.crearPreferenciaPago);

// Confirmar retorno del pago de Mercado Pago
router.post("/:id/confirmar-retorno", authenticate, ReservasController.confirmarRetornoPago);

// Cancelar una reserva pendiente
router.post("/:id/cancelar", authenticate, ReservasController.cancelarReserva);

// Webhook para Mercado Pago (público, sin authenticate)
router.post("/webhook/mercadopago", ReservasController.webhookMercadoPago);

// ── Endpoints administrativos ──────────────────────────────────────────

// Obtener transferencias pendientes de validación
router.get(
  "/pagos/pendientes",
  authenticate,
  authorize(["superadmin", "admin", "admin_provincial", "admin_federacion", "admin_club"]),
  ReservasController.getPagosPendientes,
);

// Validar una transferencia pendiente (aprobar/rechazar)
router.post(
  "/pagos/:pagoId/validar",
  authenticate,
  authorize(["superadmin", "admin", "admin_provincial", "admin_federacion", "admin_club"]),
  ReservasController.validarTransferenciaPago,
);

// Listar reservas de un club (restringido a administradores)
router.get(
  "/club/:club_id",
  authenticate,
  authorize(["admin", "superadmin", "admin_federacion", "admin_provincial"]),
  ReservasController.getReservasPorClub,
);

export default router;
