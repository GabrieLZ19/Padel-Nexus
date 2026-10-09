import { Router } from "express";
import { PaseRepresentacionController } from "../controllers/paseRepresentacion.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
const ROLES_PASE = ["superadmin", "admin", "admin_federacion", "admin_provincial"];

router.use(authenticate);

router.post("/", PaseRepresentacionController.solicitar);
router.get("/mios", PaseRepresentacionController.listarMios);
router.patch("/:id/cancelar", PaseRepresentacionController.cancelar);
router.get(
  "/pendientes",
  authorize(ROLES_PASE),
  PaseRepresentacionController.listarPendientes,
);
router.patch(
  "/:id/estado",
  authorize(ROLES_PASE),
  PaseRepresentacionController.resolver,
);

export default router;
