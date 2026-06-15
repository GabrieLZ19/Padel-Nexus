import { Router } from "express";
import {
  getAllTorneos,
  getTorneoById,
  createTorneo,
  updateTorneo,
  deleteTorneo,
  getPartidosByTorneo,
} from "../controllers/torneos.controller";

const router = Router();

router.get("/", getAllTorneos);
router.get("/:id", getTorneoById);
router.post("/", createTorneo);
router.put("/:id", updateTorneo);
router.delete("/:id", deleteTorneo);
router.get("/:id/partidos", getPartidosByTorneo);

export default router;
