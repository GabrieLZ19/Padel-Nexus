import { Router } from "express";
import {
  getAllClubes,
  createClub,
  updateClub,
  deleteClub,
} from "../controllers/clubes.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, getAllClubes);

router.post("/", authenticate, authorizeAdmin, createClub);

router.put("/:id", authenticate, authorizeAdmin, updateClub);

router.delete("/:id", authenticate, authorizeAdmin, deleteClub);

export default router;
