import { Router } from "express";
import {
  getAllTorneos,
  getTorneoById,
  createTorneo,
  updateTorneo,
  deleteTorneo,
  actualizarResultado,
  actualizarEquiposPartido,
  getPartidosByTorneo,
  getInscripcionesByTorneo,
  generarCuadros,
  getZonasByTorneo,
  moverParejaOverride,
  guardarZonasOverride,
  getAuditoriaByTorneo,
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
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  createTorneo,
);
router.put(
  "/:id",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  updateTorneo,
);
router.delete(
  "/:id",
  authorize(["superadmin", "admin_federacion", "admin"]),
  deleteTorneo,
);

router.get(
  "/:id/inscripciones",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  getInscripcionesByTorneo,
);

// Operaciones del Motor de Competencias y Avances
router.post(
  "/:id/generar-zonas",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  generarZonas,
);
router.post(
  "/:id/generar-cuadro",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  generarCuadros,
);
router.put(
  "/partidos/:partido_id/resultado",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  actualizarResultado,
);
router.put(
  "/partidos/:partido_id/equipos",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  actualizarEquiposPartido,
);
router.get(
  "/:id/zonas",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  getZonasByTorneo,
);
router.put(
  "/override/mover-pareja",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  moverParejaOverride,
);
router.put(
  "/:id/guardar-zonas",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  guardarZonasOverride,
);
router.get(
  "/:id/auditoria",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  getAuditoriaByTorneo,
);

export default router;
