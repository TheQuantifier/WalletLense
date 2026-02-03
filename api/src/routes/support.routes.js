// src/routes/support.routes.js
import express from "express";

import * as controller from "../controllers/support.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Support contact endpoint (requires auth to capture user email)
router.post("/contact", auth, controller.contactSupport);

export default router;
