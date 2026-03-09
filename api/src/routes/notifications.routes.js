import express from "express";
import auth from "../middleware/auth.js";
import * as controller from "../controllers/notifications.controller.js";

const router = express.Router();

router.get("/", auth, controller.getMine);
router.post("/:id/dismiss", auth, controller.dismissMine);

export default router;

