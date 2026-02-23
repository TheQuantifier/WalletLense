import { runWalterLensMatrix } from "../src/tests/walterlens.matrix.lib.mjs";
import { runWalterLensIntegrationChecks } from "../src/tests/walterlens.integration.lib.mjs";

const runs = Math.max(1, Number(process.env.SOAK_RUNS || 20));
const suites = [
  { name: "matrix", run: runWalterLensMatrix },
  { name: "integration", run: runWalterLensIntegrationChecks },
];

const summary = {
  runs,
  startedAt: new Date().toISOString(),
  passedRuns: 0,
  failedRuns: 0,
  suitePasses: Object.fromEntries(suites.map((s) => [s.name, 0])),
  suiteFailures: Object.fromEntries(suites.map((s) => [s.name, 0])),
  failures: [],
};

for (let i = 1; i <= runs; i += 1) {
  let runFailed = false;
  console.log(`Run ${i}/${runs}`);

  for (const suite of suites) {
    try {
      const result = await suite.run();
      if (result.failures?.length) {
        runFailed = true;
        summary.suiteFailures[suite.name] += 1;
        summary.failures.push({
          run: i,
          suite: suite.name,
          passed: result.passed,
          total: result.total,
          failures: result.failures.slice(0, 10),
        });
        console.log(`  - ${suite.name}: fail (${result.passed}/${result.total})`);
      } else {
        summary.suitePasses[suite.name] += 1;
        console.log(`  - ${suite.name}: pass (${result.passed}/${result.total})`);
      }
    } catch (err) {
      runFailed = true;
      summary.suiteFailures[suite.name] += 1;
      summary.failures.push({
        run: i,
        suite: suite.name,
        passed: 0,
        total: 0,
        failures: [String(err?.message || err)],
      });
      console.log(`  - ${suite.name}: fail (error)`);
    }
  }

  if (runFailed) {
    summary.failedRuns += 1;
  } else {
    summary.passedRuns += 1;
  }
}

summary.finishedAt = new Date().toISOString();
summary.flaky = summary.failedRuns > 0 && summary.passedRuns > 0;
summary.passRate = Number(((summary.passedRuns / summary.runs) * 100).toFixed(1));

console.log("\nWalterLens soak summary");
console.log(`- Runs: ${summary.runs}`);
console.log(`- Passed runs: ${summary.passedRuns}`);
console.log(`- Failed runs: ${summary.failedRuns}`);
console.log(`- Pass rate: ${summary.passRate}%`);
console.log(`- Flaky: ${summary.flaky ? "yes" : "no"}`);
console.log("- Suite totals:");
for (const suite of suites) {
  console.log(
    `  ${suite.name}: pass=${summary.suitePasses[suite.name]} fail=${summary.suiteFailures[suite.name]}`
  );
}

if (summary.failures.length) {
  console.log("\nFailure details:");
  summary.failures.forEach((failure) => {
    console.log(
      `- run ${failure.run} ${failure.suite} (${failure.passed}/${failure.total})`
    );
    (failure.failures || []).forEach((line) => console.log(`  ${line}`));
  });
}

process.exit(summary.failedRuns === 0 ? 0 : 1);
