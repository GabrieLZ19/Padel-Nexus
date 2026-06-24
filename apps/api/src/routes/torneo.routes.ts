import { Router } from "express";
import {
  getAllTorneos,
  getTorneoById,
  createTorneo,
  updateTorneo,
  deleteTorneo,
  actualizarResultado,
  getPartidosByTorneo,
  getInscripcionesByTorneo,
  generarCuadros,
} from "../controllers/torneo.controller";
import { generarZonas } from "../controllers/competencia.controller";
import { obtenerPosicionesZona } from "../controllers/clasificacion.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Rutas Públicas (Lectura)
router.get("/", getAllTorneos);
router.get("/:id", getTorneoById);
router.get("/:id/partidos", getPartidosByTorneo);
router.get("/:id/posiciones", obtenerPosicionesZona);

// Rutas Protegidas (Requieren autenticación)
router.use(authenticate);

router.post(
  "/",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  createTorneo,
);
router.put(
  "/:id",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  updateTorneo,
);
router.delete(
  "/:id",
  authorize(["superadmin", "admin_federacion"]),
  deleteTorneo,
);

router.get(
  "/:id/inscripciones",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  getInscripcionesByTorneo,
);

// Operaciones del Motor de Competencias y Avances
router.post(
  "/:id/generar-zonas",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  generarZonas,
);
router.post(
  "/:id/generar-cuadro",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  generarCuadros,
);
router.put(
  "/partidos/:partido_id/resultado",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  actualizarResultado,
);

export default router;
