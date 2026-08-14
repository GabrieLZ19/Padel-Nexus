import { Router } from "express";
import {
  listarFederaciones,
  obtenerFederacionPorId,
  crearFederacion,
  actualizarFederacion,
  cambiarEstadoFederacion,
} from "../controllers/federacion.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", listarFederaciones);
router.get("/:id", obtenerFederacionPorId);

router.post(
  "/",
  authenticate,
  authorize(["superadmin"]),
  crearFederacion,
);

router.put(
  "/:id",
  authenticate,
  authorize(["superadmin"]),
  actualizarFederacion,
);

router.patch(
  "/:id/estado",
  authenticate,
  authorize(["superadmin"]),
  cambiarEstadoFederacion,
);

export default router;
