import { Router } from "express";
import {
  getAllTorneos,
  getTorneoById,
  createTorneo,
  updateTorneo,
  deleteTorneo,
  getPartidosByTorneo,
} from "../controllers/torneos.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth";

const router = Router();

router.get("/", getAllTorneos);
router.get("/:id", getTorneoById);
router.get("/:id/partidos", getPartidosByTorneo);
router.post("/", authenticate, authorizeAdmin, createTorneo);
router.put("/:id", authenticate, authorizeAdmin, updateTorneo);
router.delete("/:id", authenticate, authorizeAdmin, deleteTorneo);

export default router;
