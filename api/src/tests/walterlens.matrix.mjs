import { runWalterLensMatrix } from "./walterlens.matrix.lib.mjs";

const result = await runWalterLensMatrix();
console.log(`WalterLens matrix: ${result.passed}/${result.total} (${result.rate.toFixed(1)}%)`);
if (result.failures.length) {
  console.log("Failures:");
  result.failures.forEach((line) => console.log(`- ${line}`));
}
process.exit(result.rate >= 100 ? 0 : 1);
