// src/routes/activity.routes.js
import express from "express";

import * as controller from "../controllers/activity.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, controller.getRecent);

export default router;
