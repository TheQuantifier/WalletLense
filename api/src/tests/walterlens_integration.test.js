import test from "node:test";
import assert from "node:assert/strict";
import { runWalterLensIntegrationChecks } from "./walterlens.integration.lib.mjs";

test("WalterLens integration checks pass", async () => {
  const result = await runWalterLensIntegrationChecks();
  assert.equal(result.passed, result.total);
  assert.equal(result.failures.length, 0);
});
