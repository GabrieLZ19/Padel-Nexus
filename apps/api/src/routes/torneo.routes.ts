import { Router } from "express";
import {
  getAllTorneos,
  getTorneoById,
  createTorneo,
  replicarTorneo,
  updateTorneo,
  deleteTorneo,
  actualizarResultado,
  actualizarEquiposPartido,
  getPartidosByTorneo,
  getInscripcionesByTorneo,
  generarCuadros,
  getZonasByTorneo,
  getLlaveMatriz,
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
  gestionarParejaLlave,
} from "../controllers/torneo.controller";
import {
  listarFiscales,
  crearFiscal,
  actualizarFiscal,
  cambiarEstadoFiscal,
  buscarFiscalPorDni,
  obtenerFiscalesTorneo,
  asignarFiscalesTorneo,
  habilitarAccesoFiscal,
} from "../controllers/fiscal.controller";
import { generarZonas } from "../controllers/competencia.controller";
import { obtenerPosicionesZona } from "../controllers/clasificacion.controller";
import {
  previewProgramacion,
  reprogramarProgramacion,
  publicarProgramacion,
} from "../controllers/programacion.controller";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth";

const router = Router();

// Lectura pública; si hay sesión de club, el listado se acota a su club_id
router.get("/", optionalAuthenticate, getAllTorneos);
router.get("/:id", getTorneoById);
router.get("/:id/partidos", getPartidosByTorneo);
router.get("/:id/posiciones", obtenerPosicionesZona);
router.get("/:id/zonas", getZonasByTorneo);
router.get("/:id/llave-matriz", getLlaveMatriz);

// Rutas Protegidas (Requieren autenticación)
router.use(authenticate);

router.post(
  "/",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  createTorneo,
);
router.post(
  "/:id/replicar",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  replicarTorneo,
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
  authorize([
    "superadmin",
    "admin_federacion",
    "admin_provincial",
    "admin_club",
    "admin",
  ]),
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
  "/:id/llave/pareja",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  gestionarParejaLlave,
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

// --- Programacion de horarios (borrador -> programado -> publicado) ---
router.get(
  "/:id/programacion/preview",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  previewProgramacion,
);
router.post(
  "/:id/programacion/reprogramar",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  reprogramarProgramacion,
);
router.post(
  "/:id/programacion/publicar",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  publicarProgramacion,
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
router.post(
  "/fiscales/:id/acceso",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  habilitarAccesoFiscal,
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
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin_club", "admin"]),
  guardarCanchasDisponibilidadTorneo,
);

export default router;
