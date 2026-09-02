import { Router } from "express";
import {
  listarFederaciones,
  obtenerFederacionPorId,
  crearFederacion,
  actualizarFederacion,
  cambiarEstadoFederacion,
  obtenerConfigLicenciaFederacion,
  actualizarConfigLicenciaFederacion,
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

router.get(
  "/:id/config-licencia",
  authenticate,
  authorize(["superadmin", "admin_federacion"]),
  obtenerConfigLicenciaFederacion,
);

router.patch(
  "/:id/config-licencia",
  authenticate,
  authorize(["superadmin", "admin_federacion"]),
  actualizarConfigLicenciaFederacion,
);

export default router;
