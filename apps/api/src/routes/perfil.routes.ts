import { Router } from "express";
import { PerfilController } from "../controllers/perfil.controller";
import { authenticate, authorize } from "../middleware/auth";
import { crearRateLimiter } from "../middleware/rateLimit";

const router = Router();

const rateLimitPreinscripcion = crearRateLimiter({
  clave: "preinscripcion",
  windowMs: 15 * 60 * 1000,
  max: 60,
  extraBucketKey: (req) => {
    const dni = String(req.params.dni || "").replace(/\D/g, "");
    return dni || null;
  },
});

const rateLimitRegistro = crearRateLimiter({
  clave: "registro",
  windowMs: 15 * 60 * 1000,
  max: 30,
  extraBucketKey: (req) => {
    const dni = String(req.body?.dni || "").replace(/\D/g, "");
    return dni || null;
  },
});

// ==========================================
// ENDPOINTS PÚBLICOS (Sin Token)
// ==========================================
router.post("/login", PerfilController.login);
router.post("/registro", rateLimitRegistro, PerfilController.registro);
router.post("/recuperar-password", PerfilController.solicitarRecuperarPassword);
router.get(
  "/preinscripcion/:dni",
  rateLimitPreinscripcion,
  PerfilController.buscarPreinscripcionPorDni,
);
router.post(
  "/preinscripcion/:dni/verificar",
  rateLimitPreinscripcion,
  PerfilController.verificarPreinscripcionPorDni,
);

router.get("/google", PerfilController.iniciarGoogleAuth);
router.get("/google/callback", PerfilController.googleCallback);
router.post("/google/verificar", PerfilController.verificarGoogleAuthToken);
router.get("/publico/:id", PerfilController.getPerfilPublico);

// ==========================================
//  MIDDLEWARE DE INTERCEPTACIÓN GLOBAL
// ==========================================
// De aquí en adelante se requiere obligatoriamente una sesión activa de la plataforma
router.use(authenticate);

// ==========================================
// ENDPOINTS PROTEGIDOS (Requieren Token)
// ==========================================
router.post("/actualizar-password", PerfilController.ActualizarPassword);
router.get("/me", PerfilController.getMiPerfil);
router.get("/me/panel", PerfilController.getMiPanel);
router.post("/me/solicitar-cambio", PerfilController.solicitarCambioFicha);
router.put("/me", PerfilController.updatePerfil);
router.post("/push-token", PerfilController.registrarPushToken);
router.post("/avatar", PerfilController.subirAvatar);
router.delete("/avatar", PerfilController.eliminarAvatar);

// Acceso restringido a jerarquías de administración (incl. admin de club)
router.get(
  "/:id",
  authorize([
    "superadmin",
    "admin_federacion",
    "admin_provincial",
    "admin",
    "admin_club",
  ]),
  PerfilController.getPerfilById,
);

export default router;
