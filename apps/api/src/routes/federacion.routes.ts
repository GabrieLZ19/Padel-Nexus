import { Router } from "express";
import {
  listarFederaciones,
  obtenerFederacionPorId,
} from "../controllers/federacion.controller";

const router = Router();

router.get("/", listarFederaciones);
router.get("/:id", obtenerFederacionPorId);

export default router;
