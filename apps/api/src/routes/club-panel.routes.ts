import { Router } from "express";
import { ClubPanelController } from "../controllers/club-panel.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Todas las rutas de club-panel requieren autenticación y rol de admin
router.use(authenticate);
router.use(authorize(["superadmin", "admin", "admin_club", "admin_federacion", "admin_provincial"]));

// Club
router.get("/mi-club", ClubPanelController.obtenerMiClub);
router.put("/mi-club", ClubPanelController.actualizarMiClub);

// Canchas
router.get("/mi-club/canchas", ClubPanelController.listarCanchas);
router.post("/mi-club/canchas", ClubPanelController.crearCancha);
router.put("/mi-club/canchas/:canchaId", ClubPanelController.actualizarCancha);
router.delete("/mi-club/canchas/:canchaId", ClubPanelController.eliminarCancha);

// Turnos
router.post("/mi-club/canchas/:canchaId/turnos", ClubPanelController.crearTurno);
router.delete("/mi-club/turnos/:turnoId", ClubPanelController.eliminarTurno);

// Reservas
router.get("/mi-club/reservas", ClubPanelController.obtenerReservas);

// Estadísticas
router.get("/mi-club/estadisticas", ClubPanelController.obtenerEstadisticas);

export default router;
