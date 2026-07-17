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
  obtenerSedesTorneo,
  guardarSedesTorneo,
  obtenerCanchasDisponibilidadTorneo,
  guardarCanchasDisponibilidadTorneo,
  subirBannerTorneo,
  eliminarBannerTorneo,
  guardarSiembraCustom,
} from "../controllers/torneo.controller";
import {
  listarFiscales,
  crearFiscal,
  buscarFiscalPorDni,
  obtenerFiscalesTorneo,
  asignarFiscalesTorneo,
} from "../controllers/fiscal.controller";
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
router.put(
  "/:id/banner",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  subirBannerTorneo,
);
router.delete(
  "/:id/banner",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  eliminarBannerTorneo,
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
router.post(
  "/:id/guardar-siembra",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  guardarSiembraCustom,
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

// --- Rutas de Fiscales (CRUD y Asignaciones) ---
router.get(
  "/fiscales/lista",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  listarFiscales,
);
router.post(
  "/fiscales",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  crearFiscal,
);
router.get(
  "/fiscales/dni/:dni",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  buscarFiscalPorDni,
);
router.get(
  "/:id/fiscales",
  obtenerFiscalesTorneo,
);
router.post(
  "/:id/fiscales",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  asignarFiscalesTorneo,
);

// --- Rutas de Sedes y Canchas del Torneo ---
router.get(
  "/:id/sedes",
  obtenerSedesTorneo,
);
router.post(
  "/:id/sedes",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  guardarSedesTorneo,
);
router.get(
  "/:id/canchas-disponibilidad",
  obtenerCanchasDisponibilidadTorneo,
);
router.post(
  "/:id/canchas-disponibilidad",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  guardarCanchasDisponibilidadTorneo,
);

export default router;
