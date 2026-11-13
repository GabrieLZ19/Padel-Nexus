import { Router } from "express";
import { optionalAuthenticate } from "../middleware/auth";
import {
  cifrasSitioPublico,
  verificarLicenciaPublica,
} from "../controllers/sitioPublico.controller";

const router = Router();

router.get("/cifras", cifrasSitioPublico);
router.get(
  "/licencias/verificar/:usuario_id",
  optionalAuthenticate,
  verificarLicenciaPublica,
);

export default router;
