import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const walterPath = path.resolve(__dirname, "../../../web/scripts/walterlens.js");

let cachedTestHarness = null;
const loadHarness = async () => {
  if (cachedTestHarness) return cachedTestHarness;
  globalThis.window = globalThis.window || {
    location: {
      hostname: "localhost",
      href: "http://localhost/home.html",
    },
  };
  if (!globalThis.window.location) {
    globalThis.window.location = {
      hostname: "localhost",
      href: "http://localhost/home.html",
    };
  }
  const { __walterlensTest } = await import(pathToFileURL(walterPath).href);
  cachedTestHarness = __walterlensTest;
  return cachedTestHarness;
};

const eq = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected "${expected}", got "${actual}"`);
  }
};

const deepEq = (actual, expected, message) => {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${message}: expected ${b}, got ${a}`);
  }
};

export const runWalterLensIntegrationChecks = async () => {
  const { simulateMessageHandling } = await loadHarness();
  let passed = 0;
  const failures = [];

  const runCase = async (name, fn) => {
    try {
      await fn();
      passed += 1;
    } catch (err) {
      failures.push(`${name}: ${err?.message || err}`);
    }
  };

  await runCase("public mode routes product questions without private API calls", async () => {
    const result = await simulateMessageHandling("What is WalletLens for?", {
      state: { isPublicMode: true },
      deps: {
        loadAllRecords: async () => {
          throw new Error("records API should not be called");
        },
        walterChat: async () => {
          throw new Error("chat API should not be called");
        },
      },
    });
    eq(result.route, "public_info", "route mismatch");
    deepEq(result.calls, [], "call trace mismatch");
  });

  await runCase("public mode blocks account-specific finance prompts", async () => {
    const result = await simulateMessageHandling("Show my records this month", {
      state: { isPublicMode: true },
    });
    eq(result.route, "public_private_data_blocked", "route mismatch");
  });

  await runCase("receipt history prompts call receipts API path", async () => {
    let receiptCalls = 0;
    const result = await simulateMessageHandling("what receipts have i scanned?", {
      deps: {
        listReceipts: async () => {
          receiptCalls += 1;
          return [];
        },
      },
    });
    eq(result.route, "receipt_history", "route mismatch");
    eq(receiptCalls, 1, "receipt call count mismatch");
    deepEq(result.calls, ["listReceipts"], "call trace mismatch");
  });

  await runCase("edit prompts trigger record-resolution lookup before LLM", async () => {
    let recordCalls = 0;
    const result = await simulateMessageHandling("Edit record 123 amount to 45", {
      deps: {
        loadAllRecords: async () => {
          recordCalls += 1;
          return [{ id: "123", type: "expense", amount: 10 }];
        },
        walterChat: async () => ({ intent: "edit" }),
      },
    });
    eq(result.route, "record_resolution_edit", "route mismatch");
    eq(recordCalls, 1, "record call count mismatch");
    deepEq(result.calls, ["loadAllRecords"], "call trace mismatch");
  });

  await runCase("LLM action path is selected when mocked chat returns an action", async () => {
    const result = await simulateMessageHandling("Please add an expense for lunch", {
      deps: {
        loadAllRecords: async () => [],
        walterChat: async () => ({
          intent: "create",
          action: {
            kind: "create",
            payload: { type: "expense", amount: 12.5, category: "Dining" },
          },
        }),
      },
    });
    eq(result.route, "llm_action_create", "route mismatch");
    deepEq(result.calls, ["loadAllRecords", "walterChat"], "call trace mismatch");
  });

  await runCase("falls back to deterministic local insight route when LLM is irrelevant", async () => {
    const result = await simulateMessageHandling("How much did I spend this week?", {
      deps: {
        loadAllRecords: async () => [],
        walterChat: async () => ({ intent: "unknown", reply: "" }),
      },
    });
    eq(result.route, "local_insight", "route mismatch");
    deepEq(result.calls, ["loadAllRecords", "walterChat"], "call trace mismatch");
  });

  const total = 6;
  const rate = (passed / total) * 100;
  return { passed, total, rate, failures };
};
