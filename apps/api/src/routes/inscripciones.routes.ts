import { Router } from "express";
import {
  getAllInscripciones,
  createInscripcion,
  updateEstadoPago,
} from "../controllers/inscripciones.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, authorizeAdmin, getAllInscripciones); // El admin ve todo
router.post("/", authenticate, createInscripcion); // El usuario normal se inscribe
router.put("/:id/estado", authenticate, authorizeAdmin, updateEstadoPago); // Solo admin aprueba

export default router;
