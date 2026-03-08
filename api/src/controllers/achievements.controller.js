import asyncHandler from "../middleware/async.js";
import { evaluateAchievementsForUser } from "../services/achievements.service.js";

export const getMine = asyncHandler(async (req, res) => {
  const data = await evaluateAchievementsForUser(req.user.id);
  res.json(data);
});
