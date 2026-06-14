import { Router } from "express";
import {
  getAllTorneos,
  createTorneo,
  updateTorneo,
  deleteTorneo,
} from "../controllers/torneos.controller";

const router = Router();

router.get("/", getAllTorneos);
router.post("/", createTorneo);
router.put("/:id", updateTorneo);
router.delete("/:id", deleteTorneo);

export default router;
