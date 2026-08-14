import { Router } from "express";
import {
  listarAsociaciones,
  obtenerAsociacionPorId,
  obtenerClubesAsociacion,
  obtenerTorneosAsociacion,
  obtenerJugadoresAsociacion,
  crearAsociacion,
  actualizarAsociacion,
  cambiarEstadoAsociacion,
} from "../controllers/asociacion.controller";
import { authorize, authenticate } from "../middleware/auth";

const router = Router();

router.get("/", listarAsociaciones);
router.get("/:id", obtenerAsociacionPorId);
router.get("/:id/clubes", obtenerClubesAsociacion);
router.get("/:id/torneos", obtenerTorneosAsociacion);
router.get("/:id/jugadores", obtenerJugadoresAsociacion);

router.post(
  "/",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin"]),
  crearAsociacion,
);

router.put(
  "/:id",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin"]),
  actualizarAsociacion,
);

router.patch(
  "/:id/estado",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin"]),
  cambiarEstadoAsociacion,
);

export default router;
