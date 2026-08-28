import { Router } from "express";
import {
  getAllInscripciones,
  createInscripcion,
  updateEstadoPago,
  deleteInscripcion,
  createInscripcionManual,
  importarPlanillaInscripciones,
  getElegibilidadInscripcion,
} from "../controllers/inscripcion.controller";
import { authenticate, authorize } from "../middleware/auth";
import { ROLES_ADMINISTRATIVOS } from "../constants/roles";

const router = Router();

router.use(authenticate);

router.get("/elegibilidad", getElegibilidadInscripcion);

router.get(
  "/",
  authorize(ROLES_ADMINISTRATIVOS),
  getAllInscripciones,
);

router.post("/", createInscripcion);

router.post(
  "/manual",
  authorize(ROLES_ADMINISTRATIVOS),
  createInscripcionManual,
);

router.post(
  "/importar-planilla",
  authorize(ROLES_ADMINISTRATIVOS),
  importarPlanillaInscripciones,
);

router.patch(
  "/:id/pago",
  authorize(ROLES_ADMINISTRATIVOS),
  updateEstadoPago,
);

router.delete("/:id", deleteInscripcion);

export default router;
