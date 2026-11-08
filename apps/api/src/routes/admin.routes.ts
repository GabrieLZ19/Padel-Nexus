import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Bloqueo duro: Toda acción administrativa requiere login obligatorio
router.use(authenticate);
router.use(authorize(["superadmin", "admin_federacion", "admin_provincial"]));

router.get("/crm-metricas", authorize(["superadmin"]), AdminController.getCrmMetricas);

router.get(
  "/crm-contactos",
  authorize(["superadmin"]),
  AdminController.listarContactos,
);

router.patch(
  "/crm-contactos/:perfil_id/etiquetas",
  authorize(["superadmin"]),
  AdminController.actualizarEtiquetasContacto,
);

// Endpoint maestro para arrastrar/soltar o modificar slots en las llaves/grupos
router.put("/override/partidos/:partido_id", AdminController.overridePartido);

// Endpoint para la cola de auditoría y fiscalización de árbitros
router.get("/audit/torneos/:torneo_id", AdminController.getLogsAuditoria);

export default router;
