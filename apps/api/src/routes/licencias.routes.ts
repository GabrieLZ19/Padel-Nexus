import { Router } from "express";
import { LicenciasController } from "../controllers/licencias.controller";

const router = Router();

router.get("/", LicenciasController.listarLicencias);
router.patch("/:id/estado", LicenciasController.cambiarEstadoLicencia);

export default router;
