// src/routes/appSettings.routes.js
import express from "express";
import { getPublic } from "../controllers/appSettings.controller.js";

const router = express.Router();

router.get("/public", getPublic);

export default router;
