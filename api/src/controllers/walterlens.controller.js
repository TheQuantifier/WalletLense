// src/controllers/walterlens.controller.js
import asyncHandler from "../middleware/async.js";
import { runWalterLensChat } from "../services/walterlens_chat.service.js";
import { generateHomeFocusSuggestions } from "../services/home_focus_ai.service.js";

export const chat = asyncHandler(async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const context = req.body?.context || {};

  if (!message) {
    return res.status(400).json({ message: "Message is required." });
  }

  const result = await runWalterLensChat({ message, context });
  res.json(result);
});

export const focus = asyncHandler(async (req, res) => {
  const issues = Array.isArray(req.body?.issues) ? req.body.issues : [];
  const context = req.body?.context || {};
  const suggestions = await generateHomeFocusSuggestions({ issues, context });
  res.json({ suggestions });
});
