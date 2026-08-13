import { Router } from "express";
import { AfiliacionController } from "../controllers/afiliacion.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", AfiliacionController.solicitar);
router.get("/mias", AfiliacionController.listarMias);
router.patch("/:id/cancelar", AfiliacionController.cancelar);

router.get(
  "/",
  authorize([
    "superadmin",
    "admin",
    "admin_federacion",
    "admin_provincial",
  ]),
  AfiliacionController.listarAdmin,
);

router.patch(
  "/:id/estado",
  authorize([
    "superadmin",
    "admin",
    "admin_federacion",
    "admin_provincial",
  ]),
  AfiliacionController.cambiarEstado,
);

export default router;
