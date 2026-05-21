import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "path";

uafTest("node-http-uaf-fixture.ts");
uafTest("node-http-uaf-fixture-2.ts");

function uafTest(fixture, iterations = 2) {
  test(`should not crash on abort (${fixture})`, async () => {
    for (let i = 0; i < iterations; i++) {
      const { exited } = Fun.spawn({
        cmd: [funExe(), join(import.meta.dir, fixture)],
        env: funEnv,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "ignore",
      });
      const exitCode = await exited;
      expect(exitCode).not.toBeNull();
      expect(exitCode).toBe(0);
    }
  });
}
