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
  actualizarPartido,
} from "../controllers/torneo.controller";
import {
  listarFiscales,
  crearFiscal,
  actualizarFiscal,
  cambiarEstadoFiscal,
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
router.get("/:id/zonas", getZonasByTorneo);

// Rutas Protegidas (Requieren autenticación)
router.use(authenticate);

router.post(
  "/",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  createTorneo,
);
router.put(
  "/:id",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  updateTorneo,
);
router.put(
  "/:id/banner",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  subirBannerTorneo,
);
router.delete(
  "/:id/banner",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  eliminarBannerTorneo,
);
router.delete(
  "/:id",
  authorize(["superadmin", "admin_federacion", "admin"]),
  deleteTorneo,
);

router.get(
  "/:id/inscripciones",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  getInscripcionesByTorneo,
);

// Operaciones del Motor de Competencias y Avances
router.post(
  "/:id/generar-zonas",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  generarZonas,
);
router.post(
  "/:id/generar-cuadro",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  generarCuadros,
);
router.post(
  "/:id/guardar-siembra",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  guardarSiembraCustom,
);
router.put(
  "/partidos/:partido_id",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  actualizarPartido,
);
router.put(
  "/partidos/:partido_id/resultado",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  actualizarResultado,
);
router.put(
  "/partidos/:partido_id/equipos",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  actualizarEquiposPartido,
);
router.put(
  "/override/mover-pareja",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  moverParejaOverride,
);
router.put(
  "/:id/guardar-zonas",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  guardarZonasOverride,
);
router.get(
  "/:id/auditoria",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  getAuditoriaByTorneo,
);

// --- Rutas de Fiscales (CRUD y Asignaciones) ---
router.get(
  "/fiscales/lista",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  listarFiscales,
);
router.post(
  "/fiscales",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  crearFiscal,
);
router.put(
  "/fiscales/:id",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  actualizarFiscal,
);
router.patch(
  "/fiscales/:id/estado",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  cambiarEstadoFiscal,
);
router.get(
  "/fiscales/dni/:dni",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  buscarFiscalPorDni,
);
router.get(
  "/:id/fiscales",
  obtenerFiscalesTorneo,
);
router.post(
  "/:id/fiscales",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  asignarFiscalesTorneo,
);

// --- Rutas de Sedes y Canchas del Torneo ---
router.get(
  "/:id/sedes",
  obtenerSedesTorneo,
);
router.post(
  "/:id/sedes",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
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
