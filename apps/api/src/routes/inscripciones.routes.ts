import { Router } from "express";
import {
  getAllInscripciones,
  createInscripcion,
  updateEstadoPago,
} from "../controllers/inscripciones.controller";

const router = Router();

router.get("/", getAllInscripciones);
router.post("/", createInscripcion);
router.put("/:id/estado", updateEstadoPago);

export default router;
