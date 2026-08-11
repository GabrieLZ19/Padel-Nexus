import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  requireFiscal,
  requireFiscalAsignadoAlTorneo,
} from "../middleware/fiscal.middleware";
import { FiscalPanelController } from "../controllers/fiscal-panel.controller";

const router = Router();

router.use(authenticate, requireFiscal);

router.get("/me", FiscalPanelController.getContexto);
router.get("/torneos", FiscalPanelController.getTorneos);
router.get("/jugadores/:jugadorId", FiscalPanelController.getJugador);

router.get("/torneos/:id", requireFiscalAsignadoAlTorneo, FiscalPanelController.getTorneo);
router.get("/torneos/:id/partidos", requireFiscalAsignadoAlTorneo, FiscalPanelController.getPartidos);
router.get("/torneos/:id/jugadores", requireFiscalAsignadoAlTorneo, FiscalPanelController.getJugadores);
router.get("/torneos/:id/incidencias", requireFiscalAsignadoAlTorneo, FiscalPanelController.getIncidencias);
router.post("/torneos/:id/incidencias", requireFiscalAsignadoAlTorneo, FiscalPanelController.postIncidencia);
router.get("/torneos/:id/reporte", requireFiscalAsignadoAlTorneo, FiscalPanelController.getReporte);

export default router;
