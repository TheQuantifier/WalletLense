const ALLOWED_PAY_METHODS = new Set([
  "Cash",
  "Check",
  "Credit Card",
  "Debit Card",
  "Gift Card",
  "Multiple",
  "Other",
]);

const ALLOWED_CATEGORIES = new Set([
  "Housing",
  "Utilities",
  "Groceries",
  "Transportation",
  "Dining",
  "Health",
  "Entertainment",
  "Shopping",
  "Membership",
  "Miscellaneous",
  "Education",
  "Giving",
  "Savings",
  "Other",
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value, maxLen = 240) {
  return String(value || "").trim().slice(0, maxLen);
}

function parseAmountWithWarnings(raw, field, warnings) {
  if (raw === null || raw === undefined || raw === "") return 0;
  const num = Number(String(raw).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(num)) {
    warnings.push(`${field}_not_numeric`);
    return 0;
  }
  if (num < 0) {
    warnings.push(`${field}_negative`);
    return 0;
  }
  return Number(num.toFixed(2));
}

function parseDateOnly(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return null;
  const [year, month, day] = String(dateStr).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function countWarnings(setLike) {
  return Array.isArray(setLike) ? new Set(setLike).size : 0;
}

function reconcileAmounts(normalized, warnings) {
  const subtotal = normalized.subAmount;
  const tax = normalized.taxAmount;
  const total = normalized.amount;

  if (total <= 0 && subtotal > 0 && tax >= 0) {
    normalized.amount = Number((subtotal + tax).toFixed(2));
    warnings.push("amount_inferred_from_subtotal_and_tax");
  } else if (subtotal <= 0 && total > 0 && tax >= 0) {
    normalized.subAmount = Number(Math.max(0, total - tax).toFixed(2));
    warnings.push("subtotal_inferred_from_total_and_tax");
  } else if (tax <= 0 && total > 0 && subtotal > 0) {
    normalized.taxAmount = Number(Math.max(0, total - subtotal).toFixed(2));
    warnings.push("tax_inferred_from_total_and_subtotal");
  }
}

function validateItemTotals(normalized, warnings) {
  if (!Array.isArray(normalized.items) || !normalized.items.length) return;
  const itemTotal = Number(
    normalized.items.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2)
  );
  if (itemTotal <= 0) return;

  if (normalized.subAmount <= 0) {
    normalized.subAmount = itemTotal;
    warnings.push("subtotal_inferred_from_items");
    return;
  }

  const delta = Math.abs(itemTotal - normalized.subAmount);
  if (delta > 1.0) {
    warnings.push("items_subtotal_mismatch");
  }
}

export function assessParsedReceipt(parsed, rawOcrText, options = {}) {
  const warnings = [];
  const source = normalizeText(parsed?.source || "", 140);
  const payMethod = ALLOWED_PAY_METHODS.has(parsed?.payMethod) ? parsed.payMethod : "Other";
  const category = ALLOWED_CATEGORIES.has(parsed?.category) ? parsed.category : "Other";

  if (!source) warnings.push("source_missing");
  if (!ALLOWED_PAY_METHODS.has(parsed?.payMethod)) warnings.push("pay_method_unknown");
  if (!ALLOWED_CATEGORIES.has(parsed?.category)) warnings.push("category_unknown");

  const normalized = {
    date: "",
    source,
    subAmount: parseAmountWithWarnings(parsed?.subAmount, "sub_amount", warnings),
    amount: parseAmountWithWarnings(parsed?.amount, "amount", warnings),
    taxAmount: parseAmountWithWarnings(parsed?.taxAmount, "tax_amount", warnings),
    payMethod,
    category,
    items: Array.isArray(parsed?.items)
      ? parsed.items
          .map((entry) => ({
            name: normalizeText(entry?.name || "", 120),
            price: parseAmountWithWarnings(entry?.price, "item_price", warnings),
          }))
          .filter((entry) => entry.name || entry.price > 0)
      : [],
  };

  reconcileAmounts(normalized, warnings);
  validateItemTotals(normalized, warnings);

  if (normalized.amount === 0) warnings.push("amount_zero");
  if (normalized.subAmount > normalized.amount && normalized.amount > 0) {
    warnings.push("subtotal_gt_total");
  }
  if (normalized.taxAmount > normalized.amount && normalized.amount > 0) {
    warnings.push("tax_gt_total");
  }

  const parsedDate = parseDateOnly(parsed?.date);
  const now = Date.now();
  const minDate = Date.UTC(2000, 0, 1);
  const maxDate = now + 366 * 24 * 60 * 60 * 1000;
  if (parsed?.date && !parsedDate) warnings.push("date_invalid_format");
  if (parsedDate) {
    const ts = parsedDate.getTime();
    if (ts < minDate || ts > maxDate) warnings.push("date_out_of_range");
  }
  normalized.date = parsedDate ? parsedDate.toISOString().slice(0, 10) : "";

  const hasText = normalizeText(rawOcrText || "").length > 5;
  if (!hasText) warnings.push("ocr_text_too_short");

  const uniqueWarnings = Array.from(new Set(warnings));
  const baseConfidence = Number(options.baseConfidence ?? 0.96);
  const warningPenalty = Number(options.warningPenalty ?? 0.1);
  const warningCount = countWarnings(uniqueWarnings);
  const confidence = clamp(
    Number((baseConfidence - warningCount * warningPenalty).toFixed(4)),
    0.2,
    0.99
  );

  return {
    normalized,
    confidence,
    warnings: uniqueWarnings,
    parsedDate,
  };
}

export function buildParsedReceiptPayload({ normalized, confidence, warnings, modelVersion }) {
  return {
    ...normalized,
    _meta: {
      modelVersion: modelVersion || "",
      parseConfidence: confidence,
      parseWarnings: warnings,
      parsedAt: new Date().toISOString(),
    },
  };
}
