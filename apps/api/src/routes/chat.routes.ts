import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Todas las rutas de chat requieren autenticación (sin restricción de rol)
router.use(authenticate);

// Conversaciones
router.get("/conversaciones", ChatController.listarConversaciones);
router.get("/conversaciones/:id", ChatController.obtenerMensajes);
router.post("/conversaciones", ChatController.iniciarConversacion);

// Grupos de chat
router.get("/contactos", ChatController.buscarContactos);
router.post("/grupos", ChatController.crearGrupo);
router.patch("/grupos/:id", ChatController.actualizarGrupo);

// Soporte
router.post("/soporte", ChatController.iniciarSoporte);

// No leídos
router.get("/no-leidos", ChatController.contarNoLeidos);

export default router;
