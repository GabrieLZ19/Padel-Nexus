import { Router } from "express";
import { PerfilController } from "../controllers/perfil.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ==========================================
// ENDPOINTS PÚBLICOS (Sin Token)
// ==========================================
router.post("/login", PerfilController.login);
router.post("/registro", PerfilController.registro);
router.post("/recuperar-password", PerfilController.solicitarRecuperarPassword);

router.get("/google", PerfilController.iniciarGoogleAuth);
router.get("/google/callback", PerfilController.googleCallback);
router.post("/google/verificar", PerfilController.verificarGoogleAuthToken);

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
router.put("/me", PerfilController.updatePerfil);
router.post("/avatar", PerfilController.subirAvatar);
router.delete("/avatar", PerfilController.eliminarAvatar);

// Acceso restringido exclusivamente a las jerarquías de administración FAP
router.get(
  "/:id",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  PerfilController.getPerfilById,
);

export default router;
