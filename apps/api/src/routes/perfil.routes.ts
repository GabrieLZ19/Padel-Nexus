import { Router } from "express";
import { getPerfil, updatePerfil } from "../controllers/perfil.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.get("/me", authenticate, getPerfil);
router.put("/me", authenticate, updatePerfil);
export default router;
