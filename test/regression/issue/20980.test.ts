import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

// error in beforeEach should prevent the test from running
test("20980", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/20980.fixture.ts"],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();

  expect(exitCode).toBe(1);
  expect(normalizeFunSnapshot(stderr)).toMatchInlineSnapshot(`
    "test/regression/issue/20980.fixture.ts:
    error: 5
    5
    (fail) test 0

     0 pass
     1 fail
    Ran 1 test across 1 file."
  `);
});
