// src/controllers/activity.controller.js
import asyncHandler from "../middleware/async.js";
import { listActivityForUser } from "../models/activity.model.js";

export const getRecent = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 20);
  const rows = await listActivityForUser(req.user.id, {
    limit: Number.isFinite(limit) ? limit : 20,
  });
  res.json(rows);
});
