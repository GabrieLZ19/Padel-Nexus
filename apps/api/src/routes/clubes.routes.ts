import { Router } from "express";
import {
  getAllClubes,
  createClub,
  updateClub,
  deleteClub,
} from "../controllers/clubes.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, getAllClubes);
router.post("/", authenticate, authorize(["admin"]), createClub);
router.put("/:id", authenticate, authorize(["admin"]), updateClub);
router.delete("/:id", authenticate, authorize(["admin"]), deleteClub);

export default router;
