import express from "express";
import auth from "../middleware/auth.js";
import * as controller from "../controllers/user_settings.controller.js";

const router = express.Router();

router.get("/", auth, controller.getMine);
router.put("/", auth, controller.updateMine);

export default router;

