// src/routes/support.routes.js
import express from "express";

import * as controller from "../controllers/support.controller.js";

const router = express.Router();

// Public support contact endpoint
router.post("/contact", controller.contactSupport);

export default router;
