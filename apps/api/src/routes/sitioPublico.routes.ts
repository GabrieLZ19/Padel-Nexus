import { Router } from "express";
import {
  cifrasSitioPublico,
  verificarLicenciaPublica,
} from "../controllers/sitioPublico.controller";

const router = Router();

router.get("/cifras", cifrasSitioPublico);
router.get("/licencias/verificar/:usuario_id", verificarLicenciaPublica);

export default router;
