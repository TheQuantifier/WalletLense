import { generateAiText } from "./ai_chat.service.js";
import { isSystemHealthServiceDeactivated } from "./system_health_controls.service.js";

const HOME_FOCUS_SYSTEM_PROMPT = `
You rewrite personal finance focus suggestions for a dashboard.

Rules:
- Output JSON only in this exact schema: {"suggestions":["", "", ""]}.
- Return at most 3 suggestions.
- Keep each suggestion to one short sentence.
- Use only the provided facts. Do not invent numbers or categories.
- Do not repeat the same category across suggestions.
- Keep the tone practical and neutral, not chatty.
- Do not recommend cutting essential categories unless the input explicitly names them as the issue.
`;

function extractJson(raw) {
  if (!raw || typeof raw !== "string") return null;

  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}

function sanitizeSuggestions(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0 && item.length <= 160)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

export async function generateHomeFocusSuggestions({ issues = [], context = {} } = {}) {
  if (await isSystemHealthServiceDeactivated("walterlens_service")) {
    return [];
  }

  const normalizedIssues = Array.isArray(issues)
    ? issues.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
    : [];
  if (!normalizedIssues.length) return [];

  const result = await generateAiText({
    systemPrompt: HOME_FOCUS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      issues: normalizedIssues,
      context: context && typeof context === "object" ? context : {},
    }),
  });

  if (!result.ok) return [];

  const parsed = extractJson(result.text);
  const suggestions = sanitizeSuggestions(parsed?.suggestions);
  return suggestions;
}
