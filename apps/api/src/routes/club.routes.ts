import { Router } from "express";
import {
  getAllClubes,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
  getCanchasPorClub,
  createCancha,
  updateCancha,
  deleteCancha,
  createTurno,
  deleteTurno,
  listarBloqueosClub,
  crearBloqueoClub,
  eliminarBloqueoClub,
  limitarClubAProvincia,
} from "../controllers/club.controller";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth";

const router = Router();

// El listado y la ficha se leen sin sesión. Reservar un turno sigue pidiendo cuenta.
router.get("/", optionalAuthenticate, getAllClubes);
router.get("/:id", optionalAuthenticate, limitarClubAProvincia, getClubById);
router.get(
  "/:id/canchas",
  optionalAuthenticate,
  limitarClubAProvincia,
  getCanchasPorClub,
);
router.use("/:id", authenticate, limitarClubAProvincia);

// Rutas protegidas de gestión de clubes (Solo administradores)
router.post(
  "/",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  createClub,
);

router.put(
  "/:id",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  updateClub,
);

router.delete(
  "/:id",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  deleteClub,
);

// Rutas protegidas de gestión de canchas y turnos (Para administradores de clubes)
router.post(
  "/:id/canchas",
  authenticate,
  authorize([
    "superadmin",
    "admin",
    "admin_club",
    "admin_provincial",
    "admin_federacion",
  ]),
  createCancha,
);

router.put(
  "/canchas/:id",
  authenticate,
  authorize([
    "superadmin",
    "admin",
    "admin_club",
    "admin_provincial",
    "admin_federacion",
  ]),
  updateCancha,
);

router.delete(
  "/canchas/:id",
  authenticate,
  authorize([
    "superadmin",
    "admin",
    "admin_club",
    "admin_provincial",
    "admin_federacion",
  ]),
  deleteCancha,
);

router.post(
  "/canchas/:id/turnos",
  authenticate,
  authorize([
    "superadmin",
    "admin",
    "admin_club",
    "admin_provincial",
    "admin_federacion",
  ]),
  createTurno,
);

router.delete(
  "/turnos/:id",
  authenticate,
  authorize([
    "superadmin",
    "admin",
    "admin_club",
    "admin_provincial",
    "admin_federacion",
  ]),
  deleteTurno,
);

const rolesBloqueo = [
  "superadmin",
  "admin",
  "admin_club",
  "admin_provincial",
  "admin_federacion",
] as const;

router.get(
  "/:id/bloqueos",
  authenticate,
  authorize([...rolesBloqueo]),
  listarBloqueosClub,
);
router.post(
  "/:id/bloqueos",
  authenticate,
  authorize([...rolesBloqueo]),
  crearBloqueoClub,
);
router.delete(
  "/:id/bloqueos/:bloqueoId",
  authenticate,
  authorize([...rolesBloqueo]),
  eliminarBloqueoClub,
);

export default router;
