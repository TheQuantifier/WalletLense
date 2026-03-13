import express from "express";
import auth from "../middleware/auth.js";
import * as controller from "../controllers/user_settings.controller.js";
import { exportAllData } from "../controllers/export.controller.js";

const router = express.Router();

router.get("/", auth, controller.getMine);
router.put("/", auth, controller.updateMine);
router.get("/export-all", auth, exportAllData);

export default router;
