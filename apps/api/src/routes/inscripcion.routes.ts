import { Router } from "express";
import {
  getAllInscripciones,
  createInscripcion,
  updateEstadoPago,
  deleteInscripcion,
} from "../controllers/inscripcion.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Todas las rutas de inscripción requieren autenticación base
router.use(authenticate);

// Listar inscripciones (Solo admins)
router.get(
  "/",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  getAllInscripciones,
);

// Crear inscripción (Las validaciones de rol Nacional vs Local se hacen adentro del servicio)
router.post("/", createInscripcion);

// Actualizar pago (Solo admins) - Nota: cambiaste a PATCH que es más semántico para un solo campo
router.patch(
  "/:id/pago",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  updateEstadoPago,
);

// Eliminar/Cancelar inscripción
// El controlador debe validar internamente si el que borra es el dueño o un admin
router.delete("/:id", deleteInscripcion);

export default router;
