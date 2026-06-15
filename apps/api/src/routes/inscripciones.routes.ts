import { Router } from "express";
import {
  getAllInscripciones,
  createInscripcion,
  updateEstadoPago,
} from "../controllers/inscripciones.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, authorize(["admin"]), getAllInscripciones);
router.post("/", authenticate, createInscripcion);
router.put("/:id/estado", authenticate, authorize(["admin"]), updateEstadoPago);

export default router;
