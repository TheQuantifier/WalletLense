// src/routes/index.js
import express from "express";

import authRoutes from "./auth.routes.js";
import recordsRoutes from "./records.routes.js";
import receiptsRoutes from "./receipts.routes.js";
import budgetSheetsRoutes from "./budget_sheets.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/records", recordsRoutes);
router.use("/receipts", receiptsRoutes);
router.use("/budget-sheets", budgetSheetsRoutes);

export default router;
