import { Router } from "express";
import { ReservasController } from "../controllers/reservas.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Listar reservas (restringido a administradores o dueños de clubes)
router.get(
  "/club/:club_id",
  authenticate,
  authorize(["admin", "moderador"]),
  ReservasController.getReservasPorClub,
);

// Crear nueva reserva
router.post("/", authenticate, ReservasController.crearReserva);

export default router;
