import { Router } from "express";
import {
  getAllInscripciones,
  createInscripcion,
  updateEstadoPago,
  deleteInscripcion,
} from "../controllers/inscripcion.controller";
import { authenticate, authorize } from "../middleware/auth";
import { ROLES_ADMINISTRATIVOS } from "../constants/roles";

const router = Router();

// Todas las rutas de inscripción requieren autenticación base
router.use(authenticate);

// Listar inscripciones (Solo admins)
router.get(
  "/",
  authorize(ROLES_ADMINISTRATIVOS),
  getAllInscripciones,
);

// Crear inscripción (Las validaciones de rol Nacional vs Local se hacen adentro del servicio)
router.post("/", createInscripcion);

// Actualizar pago (Solo admins) - Nota: cambiaste a PATCH que es más semántico para un solo campo
router.patch(
  "/:id/pago",
  authorize(ROLES_ADMINISTRATIVOS),
  updateEstadoPago,
);

// Eliminar/Cancelar inscripción
// El controlador debe validar internamente si el que borra es el dueño o un admin
router.delete("/:id", deleteInscripcion);

export default router;
