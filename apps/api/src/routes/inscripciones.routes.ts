import { Router } from "express";
import {
  getAllInscripciones,
  updateEstadoPago,
} from "../controllers/inscripciones.controller";

const router = Router();

router.get("/", getAllInscripciones);
router.put("/:id/estado", updateEstadoPago);

export default router;
