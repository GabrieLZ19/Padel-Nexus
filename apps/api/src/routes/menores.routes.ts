import { Router } from "express";
import {
  LegalController,
  MenoresController,
} from "../controllers/menores.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Documentos legales (público)
router.get("/legal/versiones", LegalController.getVersiones);
router.get("/legal/:tipo", LegalController.getDocumento);

// Consentimiento parental por token (público)
router.get(
  "/menores/consentimiento/:token",
  MenoresController.getConsentimientoPorToken,
);
router.post(
  "/menores/consentimiento/:token",
  MenoresController.confirmarConsentimiento,
);

// Rutas autenticadas
router.post(
  "/menores/responsable",
  authenticate,
  MenoresController.registrarResponsable,
);
router.post(
  "/menores/asentimiento",
  authenticate,
  MenoresController.asentimiento,
);
router.get(
  "/menores/autorizaciones",
  authenticate,
  MenoresController.getAutorizaciones,
);
router.get(
  "/menores/autorizaciones/:playerId",
  authenticate,
  MenoresController.getAutorizaciones,
);
router.patch(
  "/menores/autorizaciones/revocar",
  authenticate,
  MenoresController.revocar,
);
router.post(
  "/menores/transicion-adulto",
  authenticate,
  MenoresController.completarTransicionAdulto,
);

export default router;
