import test from "node:test";
import assert from "node:assert/strict";

import { validateWalterLensResponse } from "../services/walterlens_chat.service.js";
import { validateReceiptExtraction } from "../services/ai_parser.service.js";
import { assessParsedReceipt } from "../services/receipt_normalization.service.js";

test("validateWalterLensResponse rejects unsafe update action", () => {
  const result = validateWalterLensResponse({
    reply: "Updating now",
    intent: "edit",
    action: {
      kind: "update",
      id: "not-a-valid-id",
      updates: { amount: -5, secretField: "x" },
    },
    requiresConfirmation: false,
  });

  assert.equal(result.intent, "edit");
  assert.equal(result.action.kind, "");
  assert.equal(result.requiresConfirmation, false);
});

test("validateWalterLensResponse keeps safe create action and enforces confirmation", () => {
  const result = validateWalterLensResponse({
    reply: "I can add that expense.",
    intent: "create",
    action: {
      kind: "create",
      payload: {
        type: "expense",
        amount: "12.50",
        category: "Dining",
        date: "2026-02-18",
      },
    },
    requiresConfirmation: false,
  });

  assert.equal(result.action.kind, "create");
  assert.equal(result.action.payload.amount, 12.5);
  assert.equal(result.action.payload.category, "Dining");
  assert.equal(result.requiresConfirmation, true);
});

test("validateReceiptExtraction sanitizes malformed parser output", () => {
  const parsed = validateReceiptExtraction({
    date: "02/18/2026",
    source: " Store A ",
    subAmount: "$10.00",
    amount: "12.50",
    taxAmount: "2.50",
    payMethod: "Wire",
    category: "Invalid Category",
    items: [{ name: "Tea", price: "$4.00" }, { name: "", price: "bad" }],
  });

  assert.equal(parsed.date, "");
  assert.equal(parsed.source, "Store A");
  assert.equal(parsed.payMethod, "Other");
  assert.equal(parsed.category, "Other");
  assert.equal(parsed.items.length, 1);
});

test("assessParsedReceipt infers missing totals from other fields", () => {
  const assessed = assessParsedReceipt(
    {
      date: "2026-02-18",
      source: "Cafe",
      subAmount: 10,
      amount: 0,
      taxAmount: 0.8,
      payMethod: "Credit Card",
      category: "Dining",
      items: [{ name: "Latte", price: 10 }],
    },
    "Cafe receipt text"
  );

  assert.equal(assessed.normalized.amount, 10.8);
  assert.equal(assessed.normalized.subAmount, 10);
  assert.ok(assessed.warnings.includes("amount_inferred_from_subtotal_and_tax"));
  assert.ok(assessed.confidence > 0);
});
