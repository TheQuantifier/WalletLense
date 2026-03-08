import express from "express";
import auth from "../middleware/auth.js";
import * as controller from "../controllers/achievements.controller.js";

const router = express.Router();

router.get("/", auth, controller.getMine);

export default router;
