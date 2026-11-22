import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { PlatformFeeController } from "../controllers/platformFee.controller";

const router = Router();

const ADMINS_ORG = [
  "superadmin",
  "admin_federacion",
  "admin_provincial",
  "admin",
] as const;

router.post(
  "/webhook/mercadopago",
  PlatformFeeController.webhookMercadoPago,
);

router.use(authenticate);

router.get(
  "/canales",
  authorize(["superadmin"]),
  PlatformFeeController.listarCanales,
);

router.patch(
  "/canales/:canal",
  authorize(["superadmin"]),
  PlatformFeeController.actualizarCanal,
);

router.get(
  "/preferencias-org",
  authorize([...ADMINS_ORG, "admin_club"]),
  PlatformFeeController.obtenerPreferenciasOrg,
);

router.put(
  "/preferencias-org",
  authorize([...ADMINS_ORG, "admin_club"]),
  PlatformFeeController.guardarPreferenciasOrg,
);

router.get(
  "/torneos/:torneoId/saldo",
  authorize([...ADMINS_ORG, "admin_club"]),
  PlatformFeeController.saldoTorneo,
);

router.post(
  "/torneos/:torneoId/saldo/preferencia-mp",
  authorize([...ADMINS_ORG, "admin_club"]),
  PlatformFeeController.preferenciaSaldoTorneo,
);

router.get(
  "/reporte-mensual",
  authorize(["superadmin"]),
  PlatformFeeController.reporteMensual,
);

router.get(
  "/liquidaciones/resumen",
  authorize(["superadmin"]),
  PlatformFeeController.resumenLiquidaciones,
);

router.get(
  "/liquidaciones/historial",
  authorize(["superadmin"]),
  PlatformFeeController.historialLiquidaciones,
);

router.get(
  "/liquidaciones/pendientes",
  authorize(["superadmin"]),
  PlatformFeeController.liquidacionesPendientes,
);

router.post(
  "/liquidaciones",
  authorize(["superadmin"]),
  PlatformFeeController.marcarLiquidacion,
);

export default router;