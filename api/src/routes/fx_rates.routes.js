// src/routes/fx_rates.routes.js
import express from "express";

import * as controller from "../controllers/fx_rates.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Shared daily FX rates (cached)
router.get("/", auth, controller.getLatest);

export default router;
