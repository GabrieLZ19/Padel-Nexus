import { Router } from "express";
import { UsuariosController } from "../controllers/usuarios.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Bloqueo absoluto: Solo superadmin puede gestionar usuarios
router.use(authenticate);
router.use(authorize(["superadmin"]));

// CRUD de usuarios administrativos
router.post("/", UsuariosController.crearUsuario);
router.get("/", UsuariosController.listarUsuarios);
router.put("/:id", UsuariosController.actualizarUsuario);
router.patch("/:id/estado", UsuariosController.toggleEstadoUsuario);

export default router;
