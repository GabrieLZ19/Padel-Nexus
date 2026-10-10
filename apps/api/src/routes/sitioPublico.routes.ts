import { Router } from "express";
import { cifrasSitioPublico } from "../controllers/sitioPublico.controller";

const router = Router();

router.get("/cifras", cifrasSitioPublico);

export default router;
