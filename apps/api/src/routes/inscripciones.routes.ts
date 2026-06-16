import { Router } from "express";
import {
  getAllInscripciones,
  createInscripcion,
  updateEstadoPago,
  deleteInscripcion,
} from "../controllers/inscripciones.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, authorize(["admin"]), getAllInscripciones);
router.post("/", authenticate, createInscripcion);
router.put("/:id/estado", authenticate, authorize(["admin"]), updateEstadoPago);
router.delete("/:id", authenticate, deleteInscripcion);

export default router;
