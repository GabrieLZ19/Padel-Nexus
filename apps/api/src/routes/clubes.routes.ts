import { Router } from "express";
import {
  getAllClubes,
  createClub,
  updateClub,
  deleteClub,
} from "../controllers/clubes.controller";

const router = Router();

// GET /api/clubes
router.get("/", getAllClubes);

// POST /api/clubes
router.post("/", createClub);

router.put("/:id", updateClub);

router.delete("/:id", deleteClub);

export default router;
