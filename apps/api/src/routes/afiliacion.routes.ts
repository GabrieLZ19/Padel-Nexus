import { Router } from "express";
import { AfiliacionController } from "../controllers/afiliacion.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", AfiliacionController.solicitar);
router.get("/mias", AfiliacionController.listarMias);
router.patch("/:id/cancelar", AfiliacionController.cancelar);

const ROLES_AFILIACION = [
  "superadmin",
  "admin",
  "admin_federacion",
  "admin_provincial",
];

router.get(
  "/",
  authorize(ROLES_AFILIACION),
  AfiliacionController.listarAdmin,
);

router.patch(
  "/:id/estado",
  authorize(ROLES_AFILIACION),
  AfiliacionController.cambiarEstado,
);

export default router;
